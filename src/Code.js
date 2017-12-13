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

var SENDEMAILS = false;

var FULFILLMENT = 'adam.romines@gmail.com';

var CHRIS = 'adam.romines@gmail.com, adamr@telenect.com';

  // *** END STAGING GLOBALS ***

var AVAILABLE_STANDARDS = AVAILABLE_BEERS
     .getSheets()[0];

var AVAILABLE_SPECIALTIES = AVAILABLE_BEERS
     .getSheets()[1];

  // *** FLAGSHIP BEER GLOBALS(change this stuff when canned beers change) ***

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

  var onlyAvailable = function(beerRow) { return beerRow[3] === 'Y' || beerRow[3] === 'y'; };

  var templateObject = HtmlService.createTemplateFromFile('index');

  // Get arrays of currently available specialty and standard beers, expose on template object

  templateObject.specBeers = AVAILABLE_SPECIALTIES.getDataRange()
     .getValues();

  templateObject.standardBeers = AVAILABLE_STANDARDS.getDataRange()
     .getValues()
     .filter(onlyAvailable);

  // Make query string vars available on template object

  templateObject.distributorID = e.parameter.d;
  templateObject.debugMode = e.parameter.debug;
  // templateObject.distributorID = 5712;
  // templateObject.debugMode = false;

  return templateObject.evaluate().setTitle('Packaged Beer Order Form');

}


function Beer(name, sixthBBL, halfBBL, cases, specialty) {
 /*
  * Constructor for Beer object.
  *
  */

  this.name = name;
  this.sixthBBL = sixthBBL;
  this.halfBBL = halfBBL;
  this.cases = cases;
  this.specialty = specialty || false;

  }


function processForm(form) {
 /*
  * Triggered on form submit with success handler to confirm success in UI. Records raw order
  * data to Order Data spreadsheet.
  *
  * Param: form - submitted form object.
  *
  * Returns: order object for further (asynchronous) processing
  *
  */

  // Use distributor ID to retrieve Order Data and Order History spreadsheets

  var sheets = setSheets(form.distributor);

  var orderDataSheet = SpreadsheetApp.openByUrl(sheets.orderData).getSheets()[0];

  var orderID = mkOrderID(orderDataSheet);

  // build order object

  var submitted = new Date();

  var order = {

  // An order consists of beer objects constructed from form data, and meta information about the
  // order in a 'meta' object.

  meta : {
      orderID : orderID,
      submissionDate : submitted.toString(),
      distID : form.distributor,
      distributor : sheets.distName,
      short : sheets.short,
      orderData : sheets.orderData,
      orderHist : sheets.orderHistory,
      dateRequested : form.date,
      distEmail : form.email,
      comments : form.comments,
      formMode : form.formMode,
      notifEmail : form.debugEmail,
      ccChris : form.ccChris
    },


    pale : new Beer('Snake River Pale Ale', form.pale_sixth, form.pale_half, form.pale_case),
    lager : new Beer('Lager', form.lager_sixth, form.lager_half, form.lager_case),
    zonker : new Beer('Zonker Stout', form.stout_sixth, form.stout_half, form.stout_case),
//    helles : new Beer('Helles', form.helles_sixth, form.helles_half, form.helles_case),
    hefe : new Beer('Hoback Hefeweisen', form.hefe_sixth, form.hefe_half, form.hefe_case),
    pakos : new Beer('Pako\'s IPA', form.pako_sixth, form.pako_half, form.pako_case),
    snowKing : new Beer('Snow King Pale Ale', form.ska_sixth, form.ska_half, form.ska_case),
//    pakitos : new Beer('Pakito\'s Session IPA', form.pakitos_sixth, form.pakitos_half, form.pakitos_case),
    special1 : new Beer(form.specBeer1, form.specBeer1Sixth, form.specBeer1Half, 0, true),
    special2 : new Beer(form.specBeer2, form.specBeer2Sixth, form.specBeer2Half, 0, true),
    special3 : new Beer(form.specBeer3, form.specBeer3Sixth, form.specBeer3Half, 0, true),
    special4 : new Beer(form.specBeer4, form.specBeer4Sixth, form.specBeer4Half, 0, true),
    special5 : new Beer(form.specBeer5, form.specBeer5Sixth, form.specBeer5Half, 0, true),
    special6 : new Beer(form.specBeer6, form.specBeer6Sixth, form.specBeer6Half, 0, true),
    special7 : new Beer(form.specBeer7, form.specBeer7Sixth, form.specBeer7Half, 0, true)


  };

  // Write order data to Order Data spreadsheet

  writeOrderData(order);

  return order;

}



function writeOrderData (order){
 /*
  * Builds array of order data and appends as single line to Order Data sheet
  *
  * This could probably be handled by building an array with the getBeers function and then
  * writing individual beer properties to another array with a loop...but this works too.
  *
  */

  var orderDataSheet = SpreadsheetApp.openByUrl(order.meta.orderData).getSheets()[0];

  var orderLine = [order.meta.orderID, order.meta.submissionDate, order.meta.dateRequested, order.meta.comments,
    order.pale.sixthBBL, order.pale.halfBBL, order.pale.cases,
    order.lager.sixthBBL, order.lager.halfBBL, order.lager.cases,
    order.zonker.sixthBBL, order.zonker.halfBBL, order.zonker.cases,
//    order.helles.sixthBBL, order.helles.halfBBL, order.helles.cases,
    order.hefe.sixthBBL, order.hefe.halfBBL, order.hefe.cases,
    order.pakos.sixthBBL, order.pakos.halfBBL, order.pakos.cases,
    order.snowKing.sixthBBL, order.snowKing.halfBBL, order.snowKing.cases,
//    order.pakitos.sixthBBL, order.pakitos.halfBBL, order.pakitos.cases,
    order.special1.name, order.special1.sixthBBL, order.special1.halfBBL,
    order.special2.name, order.special2.sixthBBL, order.special2.halfBBL,
    order.special3.name, order.special3.sixthBBL, order.special3.halfBBL,
    order.special4.name, order.special4.sixthBBL, order.special4.halfBBL,
    order.special5.name, order.special5.sixthBBL, order.special5.halfBBL,
    order.special6.name, order.special6.sixthBBL, order.special6.halfBBL,
    order.special7.name, order.special7.sixthBBL, order.special7.halfBBL

    ];

  orderDataSheet.appendRow(orderLine);

}


function asyncProcessing(order) {
 /*
  * Writes Order History, sends email notifications, and decrements inventory (of inventory tracked
  * beers)
  *
  *
  */

  if (SENDEMAILS) {
    sendEmails(order);
  }

  decInventory(order);

  var orderHistSS = SpreadsheetApp.openByUrl(order.meta.orderHist);

  // Create new sheet in Order History sheet, named for today's date

  var newSheetName = orderHistSheetName(order.meta.orderID);

  var template = orderHistSS.getSheetByName(ORDRHISTEMPLATE);
  var newSheet = template.copyTo(orderHistSS).setName(newSheetName).activate();
  orderHistSS.moveActiveSheet(0);

  try { writeToMaster(order) }
  catch (e) {
    Logger.log(e.message);
    gBug('SRB Ordering error', e.message);
  }

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

function writeToMaster(order) {
  var last = MASTERSHEET.getLastRow();
  var currOrders = MASTERSHEET.getRange(3, 1, last, 23).getValues();
  var distInd = indexFromDistID(order.meta.distID);
  // Identify appropriate (empty) row of Current Orders sheet to write to based on distributor
  //
  if (typeof distInd === 'number') {

    var writeRow = findWriteRow(distInd);
    var orderLine = makeOrderRow(order);
    var range = MASTERSHEET.getRange(writeRow, 3, 1, orderLine[0].length);
    range.setValues(orderLine);

  } else {
    var debugString = "Distributor '" + order.meta.short + "' not found in Current Orders sheet.";
    gBug('SRB ordering error', debugString);
  }




  function findWriteRow(ind) {
    //
    // param: ind - a row to check for suitability for writing an incoming order
    //        given index to check, recursively calls itself until it can return
    //        an empty row (inserts new rows if none are found)
    //
    // returns: number of suitable row in Current Orders sheet
    //
    var distributor = currOrders[ind][1];
    if (typeof distributor === 'string' && distributor !== '') {
      // a distributor 'short name' has been found in the first column
      if (distributor === order.meta.short) {
        // it is the original row checked

        if (isEmpty(ind)) {
          // first row checked is empty! return that..
          return ind + 3;
        }

        else {
          // first row is occupied, call on next row
          return findWriteRow(ind + 1)
        }
      }
      else {
        // is a distributor short name, but not our distributor; must be next distributor
        // insert row and return appropriate index
        MASTERSHEET.insertRowAfter(ind + 2);
        return ind + 3;
      }
    }
    else {
      // was not a string in first slot; must be secondary row
      if (isEmpty(ind)) {
        return ind + 3;

      } else {
        // row was not empty, call on next row
        return findWriteRow(ind +1);
      }
    }
  }

  function isEmpty(row) {
    // row: index of currOrders values array to check
    // returns: bool -- is range empty?

    var currentRow = currOrders[row];
    for (var m=2; m < currentRow.length; m++) {
      var type = typeof currentRow[m];
      if (typeof currentRow[m] === 'number') {
        return false;
      }
    }
    // range is blank
    return true;
  }

  function indexFromDistID(id) {
    // loop through current order data identify a match with this distributor's ID
    // return index of that row
    for (var i = 0; i < last; i++) {
      if (currOrders[i][0] == id) {
        return i;
      }
    }
  }

  function makeOrderRow(order) {
    var writeRay = [[]];

    for (var i=0; i < STANDARDS.length; i++) {
      var beer = order[STANDARDS[i]];
      for (var j=0; j < UNITS.length; j++) {
        var unit = UNITS[j];

        var ind = (3*i) + j;
        writeRay[0][ind] = beer[unit];
      }
    }
    var shortDate = order.meta.dateRequested.slice(0,-5);
    writeRay[0].unshift(shortDate);
    return writeRay;
  }

}

function sendEmails (order) {

 /*
  * Uses hardcoded email copy and data from order to send an email notification to the employee
  * that must fulfill order, an an order confirmation to the customer using GmailApp.sendEmail()
  *
  */

  // Declare some useful variables from order


  var sendConfirmation = false;

  if (order.meta.distEmail) {

    var distEmail = order.meta.distEmail;

    sendConfirmation = true;

  }

  var distributor = order.meta.distributor;

  var orderHistoryURL = order.meta.orderHist;

  // Build pretty table of ordered beers

  var specialsTable = buildTable(order, 'specials');
  var fullTable = buildTable(order, 'all');
  var oneLine = tableForCopyPaste(order);


  // Confirmation email

  var confEmailHtml = '<h2>Thank you for your order.</h2>' + fullTable + '<br>To review full order details, please visit your <a href="' + orderHistoryURL + '">Order History page</a>.';

  // Just in case the email body parameter serves as plaintext fallback?

  var confTextOnly = 'Thank you for your order. To review full order details, please visit your Order History page: ' + orderHistoryURL;

  if (sendConfirmation) {

    // protect against bad email address user input
    try {
      GmailApp.sendEmail(distEmail, 'Snake River Brewing packaged beer order', confTextOnly, {
        htmlBody: confEmailHtml
      });
    }
    catch(e) {
      GmailApp.sendEmail('adam.romines@gmail.com', 'SRB: Error sending confirmation email', e.message)
    }
  }

  // Notification to whomever is doing fulfillment

  var fulfillment = order.meta.notifEmail || FULFILLMENT;

  var salutation = distributor + ' has submitted a new order';

  var specialtyString = '';

  if (specialsTable) {
    specialtyString = '<h3>Specialty Beers:</h3>' + specialsTable;
  }

  var notifEmailHtml = '<h2>' + salutation + '.</h2>' + '<h3>Order data:</h3>' + oneLine + '<br>'+ specialtyString + '<br><br><b>Order comments/special instructions:</b> ' + order.meta.comments + '<br><br>To view full order details for this or past orders, visit the ' + distributor + ' <a href="' + orderHistoryURL + '">Order History page</a>. <br><br>To view all current orders, visit the <a href="' + CURRENTORDERS + '">Current Orders Sheet</a>.';

  // Plaintext version

  var notifTextOnly = distributor + ' has submitted an order. To view full order details, please visit their Order History page: ' + orderHistoryURL;

  // Email options object

  var emailOptions = {
    htmlBody: notifEmailHtml
    };


  if ( order.meta.formMode || order.meta.ccChris ) {
    emailOptions.cc = CHRIS;
  }

  if (! order.meta.formMode ) {
    salutation = 'Testing: ' + salutation;
  }

  // Send notification email

  GmailApp.sendEmail(fulfillment, salutation, notifTextOnly, emailOptions);

}


function decInventory(order) {

  var specBeersOrdered = getSpecials(order);

  var specBeerRange = AVAILABLE_SPECIALTIES.getDataRange();

  var specBeerInventory = specBeerRange.getValues();

  var localInventory = specBeerInventory.slice(0);

  for (var i=1; i < localInventory.length; i++) {

    for (var j=0; j < specBeersOrdered.length; j++) {

      if (specBeersOrdered[j].name == localInventory[i][0]) {

        var diffBeers = subtract(localInventory[i], specBeersOrdered[j])

        localInventory[i][1] = diffBeers.sixth;
        localInventory[i][2] = diffBeers.half;
      }
    }
  }

  specBeerRange.setValues(localInventory);


}


function subtract(availableBeer, purchasedBeer) {

  var availSixth = parseInt(availableBeer[1]);
  var availHalf = parseInt(availableBeer[2]);

  var orderedSixth = parseInt(purchasedBeer.sixthBBL) || 0;
  var orderedHalf = parseInt(purchasedBeer.halfBBL) || 0;

  var difference = {

    sixth : availSixth - orderedSixth,
    half : availHalf - orderedHalf

  }

  return difference;

}

function tableForCopyPaste(order) {
  var shortDate = order.meta.dateRequested.slice(0,-5);

  var tableHeader = '<table style="border: 1px solid black; border-collapse: collapse;"> <tr><td></td> <th colspan="3" style="border: 1px solid black; text-align: center;">Pale</th> <th style="border: 1px solid black; text-align: center;" colspan="3">Lager</th> <th style="border: 1px solid black; text-align: center;" colspan="3">Stout</th> <th style="border: 1px solid black; text-align: center;" colspan="3">Pakos</th> <th style="border: 1px solid black; text-align: center;" colspan="3">Snow King</th> <th style="border: 1px solid black; text-align: center;" colspan="3">Hefe</th> </tr> <tr> <td style="border: 1px solid black; text-align: center;">Date</td> <td style="border: 1px solid black; text-align: center;">case</td> <td style="border: 1px solid black; text-align: center;">1/2 BBL</td> <td style="border: 1px solid black; text-align: center;">1/6 BBL</td> <td style="border: 1px solid black; text-align: center;">case</td> <td style="border: 1px solid black; text-align: center;">1/2 BBL</td> <td style="border: 1px solid black; text-align: center;">1/6 BBL</td> <td style="border: 1px solid black; text-align: center;">case</td> <td style="border: 1px solid black; text-align: center;">1/2 BBL</td> <td style="border: 1px solid black; text-align: center;">1/6 BBL</td> <td style="border: 1px solid black; text-align: center;">case</td> <td style="border: 1px solid black; text-align: center;">1/2 BBL</td> <td style="border: 1px solid black; text-align: center;">1/6 BBL</td> <td style="border: 1px solid black; text-align: center;">case</td> <td style="border: 1px solid black; text-align: center;">1/2 BBL</td> <td style="border: 1px solid black; text-align: center;">1/6 BBL</td> <td style="border: 1px solid black; text-align: center;">case</td> <td style="border: 1px solid black; text-align: center;">1/2 BBL</td> <td style="border: 1px solid black; text-align: center;">1/6 BBL</td> </tr>';
  var rowStart = '<tr><td style="border: 1px solid black; text-align: center;">' + shortDate + '</td>';
  var tableString = tableHeader + rowStart;

  for (var i=0; i < STANDARDS.length; i++) {
    var beer = order[STANDARDS[i]];
    for (var j=0; j < UNITS.length; j++) {
      var unit = UNITS[j]
      var contents = beer[unit] ? beer[unit] : '&nbsp;'
      tableString += '<td style="border: 1px solid black; text-align: center;">' + contents + '</td>';
    }
  }

  tableString += '</tr></table>';

  return tableString;
}

function buildTable(order, restrict) {
 /*
  * Builds html table for use in email. Even and odd rows get different backgrounds for readability.
  *
  */
  var tableString = '';

  var beers = getBeers(order, restrict);

//  Logger.log('beers: %s', beers);

  if (beers.length) {
    tableString += '<table style="border: 1px solid black; border-collapse: collapse;"><tr><th style="border: 1px solid black;">Beer</th><th style="border: 1px solid black;">Cases</th><th style="border: 1px solid black;">1/2 Barrel Kegs</th><th style="border: 1px solid black;">1/6 Barrel Kegs</th></tr>';

    for (var i=0; i < beers.length; i++) {
      if (i%2 == 0) {
        tableString += beerToTableRow(beers[i], 'even');
      }
      else { tableString += beerToTableRow(beers[i], 'odd'); }
    }

    tableString += '</table>';

  }



  return tableString;

}


function beerToTableRow(beer, oddOrEven) {
 /*
  * Wraps beer data in <td> tags inside <tr>, styled according to even or odd
  *
  */

  var rowData = [
    beer.name,
    beer.cases,
    beer.halfBBL,
    beer.sixthBBL
  ];

  if ( beer.specialty ){
    rowData[1] = '&nbsp;';
  }

  var trString = '<tr>';

  if ( oddOrEven == 'odd' ){
    trString = '<tr style="background-color: #E6E6E6;">';
  }

  for (var i = 0; i < rowData.length; i++) {
    trString += '<td style="border: 1px solid black; text-align: center;">' + rowData[i] + '</td>';
  }

  trString += '</tr>';

  return trString;

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

function setSheets(distID) {

 /*
  * Given distributor ID, returns object with URLs for order data, history sheets
  *
  */

  var distSheetRange = DISTRIBUTORS.getDataRange();

  var values = distSheetRange.getValues();

  if (distID) {

    // un-obfuscate distributor ID

    var row = (distID % 100)/4;

    // binds URLs of distributor Order Data and Order History sheets to properties of
    // distSheets object

    var distSheets = {
      orderData: values[row-1][4],
      orderHistory: values[row-1][2],
      distName: values[row-1][1],
      short: values[row-1][6]
    };
  }

    return distSheets;

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


function gBug(subj, body) {

  body = body || subj

  GmailApp.sendEmail("adam.romines@gmail.com", subj, body);

}


// ##############################################################################
