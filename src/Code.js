 /*
  * This apps script generates an html order form appropriate for placing wholesale orders,
  * records these orders in Google spreadsheets, and sends email notifications to begin the
  * fulfillment process.
  *
  * Data is recorded to two spreadsheets, Order Data and Order History. Order Data is intended
  * to be an unformatted view of orders, with each order occupying a single row in one large
  * table. Order History provides a more visual representation of each order, one per sheet.
  *
  */

  // Global variables for accessing spreadsheet of customers (and URLs for Order History, Order
  // Data spreadsheets).

var UNITS = ['cases', 'halfBBL', 'sixthBBL'];

var TEMPLATES = SpreadsheetApp
     .openById('1YtKYBlfKC09uwk5BU9Ia8a1KogLJuaIZIh0Kf4JNTSc');

  // *** STAGING GLOBALS (change this stuff when going from DEV to LIVE ***

var DISTRIBUTORS = SpreadsheetApp
     .openById('1YpfeSqd4aeoZ9_u4fS4dsJFhwr_Uqw04bv9aW77ckJA')
     .getSheets()[0];

var AVAILABLE_BEERS = SpreadsheetApp
     .openById('1uIvq7G9ai4dhhszwpFKlSqc5KLczi_AFjWGHlGjxWlg');

var MASTERSHEET = SpreadsheetApp
     .openById('1APT5vO0k_dGiLADR6uYZf3wgSEORgp6h3F53Vbch68M')
     .getSheets()[0];

var CURRENTORDERS = "https://docs.google.com/spreadsheets/d/1APT5vO0k_dGiLADR6uYZf3wgSEORgp6h3F53Vbch68M/edit";

var SENDEMAILS = true;

var FULFILLMENT = 'adam.romines@gmail.com';

var CHRIS = 'adam.romines@gmail.com, adamr@telenect.com';

  // *** END STAGING GLOBALS ***

var AVAILABLE_STANDARDS = AVAILABLE_BEERS
  .getSheets()[0]
  .getDataRange()
  .getValues()
  .filter(availableOnly)
  .map(buildAvailableCannedBeer);

var AVAILABLE_SPECIALTIES = AVAILABLE_BEERS
  .getSheets()[1]
  .getDataRange()
  .getValues()
  .map(buildAvailableSpecialtyBeer);

AVAILABLE_SPECIALTIES.shift();

var STANDARDS = ['pale','lager','zonker','pakos','snowKing', 'hefe'];

var ORDRHISTEMPLATE = '2018 w/ Snow King';
// 'Template - 2017 w/ Helles'
// 'Blank w/ Pakitos'
// 'Blank w/ SK'
// 'Blank Sheet'

var SPECIALSROWINDEX = 10;
// if only 5 canned beers, use 9

  // *** END FLAGSHIP BEER GLOBALS ***

function doGet(e) {

  var templateObject = HtmlService.createTemplateFromFile('index');

  // Expose arrays of currently available specialty and standard beers on template object

  templateObject.specBeers = AVAILABLE_SPECIALTIES;
  templateObject.standardBeers = AVAILABLE_STANDARDS;

  // Make query string vars available on template object

  templateObject.distributorId = e.parameter.d;
  templateObject.debugMode = e.parameter.debug;

  return templateObject.evaluate().setTitle('Packaged Beer Order Form');

}

function processForm(data) {
 /*
  * Triggered on form submit
  *
  */

  // Use distributor ID to retrieve Order Data and Order History spreadsheets



  var prepareOrder = function (data) {

    data.meta.submissionDate    = (new Date()).toString();
    data.meta.distributor       = getDistributor(data.meta.distributorId);
    var orderDataSheet          = SpreadsheetApp.openByUrl(data.meta.distributor.orderData).getSheets()[0];
    data.meta.orderID           = mkOrderID(orderDataSheet);

    return data;

  };

  var order = prepareOrder(data);

  // order.meta.numCanned = getNumberNonEmptyByType(order, 'canned');

  writeOrderData(order);
  // var stringy = JSON.stringify(order);
  // gBug('order data', stringy);
  // Logger.log(stringy);

  // if (SENDEMAILS) sendEmails(order);

  // return value gets passed to client side success handler
  return order;

}


function writeOrderData(order) {
 /*
  * Builds a one dimensional array of order data
  * written as single line to Order Data sheet
  *
  */
  var orderLine = [order.meta.orderID, order.meta.submissionDate, order.meta.dateRequested, order.meta.comments];

  order.standard.forEach(function (beer) {
    orderLine.push('name: ' + beer.name, '1/6th: ' + beer.sixth, '1/2th: ' +  beer.half, 'case : ' +  beer.cases);
  });

  order.writeIn.forEach(function (beer) {
    orderLine.push('name: ' + beer.name, '1/6th: ' + beer.sixth, '1/2th: ' +  beer.half);
  });

  var orderDataSheet = SpreadsheetApp.openByUrl(order.meta.distributor.orderData).getSheets()[0];

}

function sendEmails (order) {

 /*
  * Send an email notification to the employee that must fulfill order
  * and an order confirmation to the customer using GmailApp.sendEmail()
  *
  */
  var sendOrderConfirmation = function (order) {

    var confEmailHtml = '<h2>Thank you for your order.</h2>' + buildTable(order, ['canned', 'specialty']) + '<br>To review full order details, please visit your <a href="' + order.meta.orderHist + '">Order History page</a>.';
    var confTextOnly = 'Thank you for your order. To review full order details, please visit your Order History page: ' + order.meta.orderHist;

    if (order.meta.distEmail && isValidEmailAddress(order.meta.distEmail)) {    // TODO: move email address validation to client, leave try/catch as failsafe
      // protect against bad email address user input
      try {
        GmailApp.sendEmail(order.meta.distEmail, 'Snake River Brewing packaged beer order', confTextOnly, {
          htmlBody: confEmailHtml
        });
      }
      catch(e) {
        GmailApp.sendEmail('adam.romines@gmail.com', 'SRB: Error sending confirmation email', e.message)
      }
    }
  };

  var sendNewOrderNotification = function (order) {
    // Notification to whomever is doing fulfillment

    var tableForCopyPaste = function (order) {

      var shortDate = order.meta.dateRequested.slice(0,-5);
      var tableHeader = '<table style="border: 1px solid black; border-collapse: collapse;"> <tr><td></td> <th colspan="3" style="border: 1px solid black; text-align: center;">Pale</th> <th style="border: 1px solid black; text-align: center;" colspan="3">Lager</th> <th style="border: 1px solid black; text-align: center;" colspan="3">Stout</th> <th style="border: 1px solid black; text-align: center;" colspan="3">Pakos</th> <th style="border: 1px solid black; text-align: center;" colspan="3">Snow King</th> <th style="border: 1px solid black; text-align: center;" colspan="3">Hefe</th> </tr> <tr> <td style="border: 1px solid black; text-align: center;">Date</td> <td style="border: 1px solid black; text-align: center;">case</td> <td style="border: 1px solid black; text-align: center;">1/2 BBL</td> <td style="border: 1px solid black; text-align: center;">1/6 BBL</td> <td style="border: 1px solid black; text-align: center;">case</td> <td style="border: 1px solid black; text-align: center;">1/2 BBL</td> <td style="border: 1px solid black; text-align: center;">1/6 BBL</td> <td style="border: 1px solid black; text-align: center;">case</td> <td style="border: 1px solid black; text-align: center;">1/2 BBL</td> <td style="border: 1px solid black; text-align: center;">1/6 BBL</td> <td style="border: 1px solid black; text-align: center;">case</td> <td style="border: 1px solid black; text-align: center;">1/2 BBL</td> <td style="border: 1px solid black; text-align: center;">1/6 BBL</td> <td style="border: 1px solid black; text-align: center;">case</td> <td style="border: 1px solid black; text-align: center;">1/2 BBL</td> <td style="border: 1px solid black; text-align: center;">1/6 BBL</td> <td style="border: 1px solid black; text-align: center;">case</td> <td style="border: 1px solid black; text-align: center;">1/2 BBL</td> <td style="border: 1px solid black; text-align: center;">1/6 BBL</td> </tr>';
      var rowStart = '<tr><td style="border: 1px solid black; text-align: center;">' + shortDate + '</td>';
      var tableString = tableHeader + rowStart;

      order.canned.filter(function (beer) {
        return beer.half || beer.sixth || beer.cans;
      }).forEach(function (beer) {
        ['cans', 'half', 'sixth'].forEach(function (unit) {
          var contents = beer[unit] ? beer[unit] : '&nbsp;'
          tableString += '<td style="border: 1px solid black; text-align: center;">' + contents + '</td>';
        });
      });

      return tableString + '</tr></table>';

    };

    var distributor               = order.meta.distributor;
    var fulfillment               = order.meta.notificationEmail || FULFILLMENT;
    var salutation                = distributor + ' has submitted a new order';
    // var specialtyString           = order.meta.numSpecialties ? '<h3>Specialty Beers:</h3>' + buildTable(order, ['specialty']) : '';
    var specialtyString           = '';
    var notificationEmailHtml     = '<h2>' + salutation + '.</h2>' + '<h3>Order data:</h3>' + tableForCopyPaste(order) + '<br>'+ specialtyString + '<br><br><b>Order comments/special instructions:</b> ' + order.meta.comments + '<br><br>To view full order details for this or past orders, visit the ' + distributor + ' <a href="' + order.meta.orderHist + '">Order History page</a>. <br><br>To view all current orders, visit the <a href="' + CURRENTORDERS + '">Current Orders Sheet</a>.';
    var textOnly                  = distributor + ' has submitted an order. To view full order details, please visit their Order History page: ' + order.meta.orderHist;
    var emailOptions              = { htmlBody: notificationEmailHtml };

    if ( order.meta.ccChris ) emailOptions.cc = CHRIS;
    if ( order.meta.formMode === 'debug') salutation = 'Testing: ' + salutation;

    GmailApp.sendEmail(fulfillment, salutation, textOnly, emailOptions);

  };

  sendNewOrderNotification(order);
  sendOrderConfirmation(order);

}

function buildTable (order, typesToInclude) {

 /*
  * Builds html table for use in email. Even and odd rows get different backgrounds for readability.
  *
  */
  var beerToTableRow = function (beer, oddOrEven) {

    var rowData = [ beer.name, beer.cans ? beer.cans : '&nbsp;', beer.half, beer.sixth ];
    var trString = ( oddOrEven == 'odd' ) ? '<tr style="background-color: #E6E6E6;">' : '<tr>';

    rowData.forEach(function (item) {
      trString += '<td style="border: 1px solid black; text-align: center;">' + item + '</td>';
    });
    return trString + '</tr>';
  };

  var tableString = '<table style="border: 1px solid black; border-collapse: collapse;"><tr><th style="border: 1px solid black;">Beer</th><th style="border: 1px solid black;">Cases</th><th style="border: 1px solid black;">1/2 Barrel Kegs</th><th style="border: 1px solid black;">1/6 Barrel Kegs</th></tr>';

  typesToInclude.forEach(function (beerType) {

    var nonEmptyBeers = Object.keys(order[beerType]).map(function (beerKey) {
      return order[beerType][beerKey];
    }).filter(function (beer) {
      return beer.half || beer.sixth || beer.cans;
    });

    for (var i=0; i < nonEmptyBeers.length; i++) {
      if (i%2 === 0) {
        tableString += beerToTableRow(nonEmptyBeers[i], 'even');
      }
      else { tableString += beerToTableRow(nonEmptyBeers[i], 'odd'); }
    }

  });

  return tableString + '</table>';

}


function asyncProcessing(order) {
 /*
  * Writes Order History, sends email notifications, and decrements inventory (of inventory tracked
  * beers)
  *
  *
  */



  var orderHistSS = SpreadsheetApp.openByUrl(order.meta.orderHist);

  // Create new sheet in Order History sheet, named for today's date

  var newSheetName = orderHistSheetName(order.meta.orderID);

  var template = orderHistSS.getSheetByName(ORDRHISTEMPLATE);
  var newSheet = template.copyTo(orderHistSS).setName(newSheetName).activate();
  orderHistSS.moveActiveSheet(0);

  // Order Meta Data
  //
  //
  // Create array of Order ID, Submission Date and Date Requested and write to new Order History sheet

  var rawDate = new Date(order.meta.submissionDate);
  var friendlyDate = (rawDate.getMonth() + 1).toString() + '/' + rawDate.getDate().toString() + '/' + rawDate.getFullYear().toString();

  var metaLeft = [[order.meta.distributor], [order.meta.orderID], [order.meta.comments]]; //, [order.meta.dateRequested]];
  var metaRight = [[friendlyDate], [order.meta.dateRequested]]

  newSheet.getRange(1, 2, 3, 1).setValues(metaLeft);
  newSheet.getRange(1, 4, 2, 1).setValues(metaRight);

  // Standard Beers
  //
  //
  // Create array of standard beer objects from incoming order

  var stdBeerRay = getStandards(order);

  // Create empty array that will be written to Order History spreadsheet range

  var stdBeerWriteRay = [];

  // Loop through incoming beers, append to array

  for (var i = 0; i < stdBeerRay.length; i++) {

    var theThree = [stdBeerRay[i].cases, stdBeerRay[i].halfBBL, stdBeerRay[i].sixthBBL ];

    stdBeerWriteRay.push(theThree);

  }

  // Get 5 (or 6) x3 range and write standard beers to it

  newSheet.getRange(4, 3, stdBeerWriteRay.length, 3).setValues(stdBeerWriteRay);

  // Specialty Beers
  //
  //
  // Similar to standard beers, create ordered array of incoming beers, create and write to
  // array of decomposed beer objects and write to spreadsheet

  var specBeerRay = getSpecials(order);

  var specBeerWriteRay = [];

  for (var j = 0; j < specBeerRay.length; j++) {

    if (! noneOrdered(specBeerRay[j]) ) {

      var theTwo = [specBeerRay[j].name, '', specBeerRay[j].halfBBL, specBeerRay[j].sixthBBL ];

      specBeerWriteRay.push(theTwo);

      }
    }

  if (specBeerWriteRay.length !== 0) {

    newSheet.getRange(SPECIALSROWINDEX, 2, specBeerWriteRay.length, 4).setValues(specBeerWriteRay);
  }

}

function doCopy() {
  copyTemplateToOrderHistorySheets('Template - 2017 w/ Hefe');
}

function copyTemplateToOrderHistorySheets (sheetName) {
  var template = TEMPLATES.getSheetByName(sheetName);
  var distributors = DISTRIBUTORS.getDataRange().getValues();
  for (var i = 1; i<distributors.length; i++) {
    var url = distributors[i][2];
    var destination = SpreadsheetApp.openByUrl(url);
    template.copyTo(destination);
  }
}

function doRename() {
  renameOrderHistorySheets('Copy of Template - 2017 w/ Hefe', 'Template - 2017 w/ Hefe')
}

function renameOrderHistorySheets (oldSheetName, newSheetName) {

  var distributors = DISTRIBUTORS.getDataRange().getValues();
  for (var i = 1; i<distributors.length; i++) {
    var url = distributors[i][2];
    var spreadSheet = SpreadsheetApp.openByUrl(url);
    var sheet = spreadSheet.getSheetByName(oldSheetName);
    sheet.setName(newSheetName);
  }
}

function getDistributor(distributorId) {

 /*
  * Given distributor ID, returns object with URLs for order data, history sheets
  *
  */

  if (!distributorId) return;

  var distSheetRangeValues = DISTRIBUTORS.getDataRange().getValues();
    var row = (distributorId % 100)/4;

  return {
    orderData: distSheetRangeValues[row-1][4],
    orderHistory: distSheetRangeValues[row-1][2],
    name: distSheetRangeValues[row-1][1],
    id: distributorId
  };

}

function mkOrderID(orderDataSheet){

 /*
  * Constructs unique order IDs based on date. Second (and subsequent) orders on a single day are
  * given consecutive IDs
  * This could be useful later.
  *
  */

  var lastRow = orderDataSheet.getLastRow();
  var prevID = orderDataSheet.getRange(lastRow, 1).getValue().toString();
  var today = new Date();
  var dateString = today.getFullYear().toString()

  // pad single digit month and days with '0' for length consistency

  dateString += ((today.getMonth() + 1) < 10 ? '0' : '') + (today.getMonth() +1).toString();
  dateString += (today.getDate() < 10 ? '0' : '') + today.getDate().toString();

  if (dateString == (prevID.slice(0,8))) {
    return (parseInt(prevID) + 1).toString();
    }
  else {
    return dateString + '01';
  }
}

function orderHistSheetName(orderID) {
 /*
  * Constructs unique Order History Tab names based on orderID. Second (and subsequent) orders
  * on a single day are given consecutive names ('.02', '.03', etc.)
  *
  *
  */

  var year = orderID.slice(2,4);
  var month = orderID.slice(4,6);
  var day = orderID. slice(6,8);

  var prettyName = month + '/' + day + '/' + year;

  var lastTwo = orderID.slice(-2);

  if (lastTwo != '01') {
    prettyName += '.' + lastTwo;
  }

  return prettyName;

}


function getBeers(order, type) {

 /*
  * Arguments: order object
  *
  * Returns: ordered list of none-empty beers, standards first
  *
  */

  if (type === 'all') {
    var standards = getStandards(order);
    var inBeers = standards.concat(getSpecials(order));
  } else {
    var inBeers = getSpecials(order);
  }

  var beers = [];

  for (var i = 0; i < inBeers.length; i++) {
    if (! noneOrdered(inBeers[i])){
      beers.push(inBeers[i]);
    }
  }

  return beers;

}

function  getStandards(order) {

  // Builds ordered array of standard beers
  // TODO: change to use global STANDARDS
  var standards = [order.pale, order.lager, order.zonker, order.pakos, order.snowKing, order.hefe];

  return standards;

}

function getSpecials(order) {

  // Builds ordered array of specialty beers

  var specialties = [order.special1, order.special2, order.special3, order.special4, order.special5, order.special6, order.special7];

  return specialties;

}

function noneOrdered(beer) {
 /*
  *
  * method that determines if all unit values (halfBBL, sixthBBL, case) are
  * zero or undefined for this beer.
  *
  * Returns: boolean
  */

  var empty = false;

  if ( isEmpty(beer.sixthBBL) && isEmpty(beer.halfBBL) && isEmpty(beer.cases) ) {

    empty = true;

  }

  return empty;

}

function isEmpty(unit) {
 /*
  * Function to test single unit (halfBBL, sixthBBL or cases) within Beer
  * object for 'emptiness.' Returns true if given unit is 0, undefined,
  * null, etc.
  */

  empty = false;

  if (! unit) {
    empty = true; }
  else if ( unit == '0' ) {
    empty = true;
  }

  return empty;

}

function getNumberNonEmptyByType (order, beerType) {
  return Object.keys(order[beerType]).map(function (beerKey) {
    return order[beerType][beerKey];
  }).filter(function (beer) {
    return beer.half || beer.sixth || beer.cans;
  }).length;
}

function toCamelCase(s) {
  // remove all characters that should not be in a variable name
  // as well underscores an numbers from the beginning of the string
  s = s.replace(/([^a-zA-Z0-9_\- ])|^[_0-9]+/g, "").trim().toLowerCase();
  // uppercase letters preceeded by a hyphen or a space
  s = s.replace(/([ -]+)([a-zA-Z0-9])/g, function(a,b,c) {
      return c.toUpperCase();
  });
  // uppercase letters following numbers
  s = s.replace(/([0-9]+)([a-zA-Z])/g, function(a,b,c) {
      return b + c.toUpperCase();
  });
  return s;
}

function isValidEmailAddress(emailAddress) {
  var regex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return regex.test(emailAddress);
}

function availableOnly (beerRow) { return beerRow[3] === 'Y' || beerRow[3] === 'y'; }

function buildAvailableSpecialtyBeer(beerRow) {
  return {
    name: beerRow[0],
    availableSixth: beerRow[1],
    availableHalf: beerRow[2],
    descriptionUrl: beerRow[3],
    camelCasedName: toCamelCase(beerRow[0])
  };
}

function buildAvailableCannedBeer(beerRow) {
  return {
    name: beerRow[0],
    imgSrc: beerRow[2],
    camelCasedName: toCamelCase(beerRow[0])
  };
}

function gBug(subj, body) {

  body = body || subj

  GmailApp.sendEmail("adam.romines@gmail.com", subj.substring(0, 65), body);

}


// ##############################################################################
