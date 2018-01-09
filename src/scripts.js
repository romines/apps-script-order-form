document.addEventListener("DOMContentLoaded", function(event) {
  var $submit;

  addSubmitButtonHandler();
  addButtonStateManager();
  addEmailValidation();
  setWriteInKeyupHandler();
  makeSomeInputsNumbersOnly();

  addDebugToggleHandler();
  // validateSpecialtyQuantities();

  $( "#deliveryDate" ).datepicker();

  function addSubmitButtonHandler() {

    var submitForm = function () {
      var handleSubmitInUI = function (){
        window.scrollTo(0, 0);
        $('form').hide();
        $('#standBy').show();
      };
      var form = $('form')[0];
      google.script.run
        .withSuccessHandler(successConfirmation)
        .processForm(form);
      handleSubmitInUI();
    };

    $('form').on('click', '.form-submit-button.active', submitForm);

  }


  function successConfirmation(order) {

    var message = '<p>Thank you for your submission. If you entered an email address for confirmation, you should receive an email shortly.<br> To review your order, please visit the <a href="' + order.meta.orderHist + '" target="_blank">Order History page</a>.</p>';

    $('#standBy').hide();
    $('#output').prepend(message).show();

  }

  function emailIsValidIfPresent() {

    var userEntry = $('#email').val();
    if (userEntry === '') return true;

    var isValidEmailAddress = function (emailAddress) {
      var regex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
      return regex.test(emailAddress);
    };
    return isValidEmailAddress(userEntry);
  }

  function addButtonStateManager() {

    $submit = $('.form-submit-button');

    var someBeersOrdered = function () {
      return $('.beers .beer').map(function () {
        var userEntry = $(this).val();
        if (!userEntry) return null;
        return parseInt(userEntry, 10);
      }).get()
      .filter(function (beerOrdered) { return !!beerOrdered; })
      .length;
    };

    // var specialtyQuantitiesAreValid = function () {
    //   $('#qExceeded').hide();
    //   $('.specIn').each(function(index) {
    //     var inputVal = parseInt($(this).val(), 10);
    //     var availableQ = parseInt($(this).parent().prev().text(), 10);
    //     if (inputVal > availableQ) $(this).addClass('red');
    //   });

    //   if ($('.specialty').find('input.red').length > 0) {
    //     $('#qExceeded').show();
    //     return false;
    //   } else {
    //     return true;
    //   }
    // };

    $('.trigger-validation').keyup(function () {

      $submit.removeClass('active');
      $('.form-container').removeClass('invalid');

      if (someBeersOrdered() && emailIsValidIfPresent()) {
        $submit.addClass('active');
      } else {
        $('.form-container').addClass('invalid');
      }

    });
  }

  function addEmailValidation() {

    $('#email').focus(function(e) {
      // trying or trying again
      $('.validation-error').hide();
      $('.form-container').removeClass('invalid-email');
    });

    $('#email').blur(function() {
      if (!emailIsValidIfPresent()) {
        $('.validation-error').show();
        $('.form-container').addClass('invalid-email');
      }
    });

  }

  function setWriteInKeyupHandler() {

    var rowIsEmpty = function ($row) {
      return !($row.find('textarea').val().length || $row.find('input').filter(function () { return $(this).val() !== ""; }).length);
    };

    var onWriteInKeyup = function () {

      var $newWriteInRow;
      var $lastWriteInRow = $('tr.write-in:last-of-type');

      var lastWriteInRowIsFull = function ($lastWriteInRow) {
        var $beerName = $lastWriteInRow.find('textarea');
        var $inputs = $lastWriteInRow.find('input');

        var hasValidQ = function () {
          return !!$inputs.map(function () {
            var userEntry = $(this).val();
            if (!userEntry) return null;
            return parseInt(userEntry, 10);
          }).get()
          .filter(function (beerOrdered) { return !!beerOrdered; })
          .length;
        };


        return $beerName.val().length && hasValidQ();

      };

      var noEmptyRowExists = function () {
        return $('tr.write-in').filter(function () { return rowIsEmpty($(this)); }).length < 1;
      }

      var trimExtraWriteInRows = function () {

        var $writeInRows = $('tr.write-in');
        var numEmptyRows = $writeInRows.filter(function () { return rowIsEmpty($(this)); }).length;
        var $reversed = $($writeInRows.get().reverse());

        $reversed.each(function () {
          var $row = $(this);
          if (rowIsEmpty($row) && numEmptyRows >= 2) {
            $row.remove();
            numEmptyRows -= 1;
          }
        });

      };

      if (lastWriteInRowIsFull($lastWriteInRow) && noEmptyRowExists()) {

        $newWriteInRow = $lastWriteInRow.clone();
        $newWriteInRow.find('textarea').val('');
        $newWriteInRow.find('input').val('');
        $newWriteInRow.appendTo('.specialty').hide().fadeIn(600, setWriteInKeyupHandler);

      } else {
        trimExtraWriteInRows();
        setWriteInKeyupHandler();
      }

    };

    $('.specialty').one('keyup', onWriteInKeyup)

  }

  function addDebugToggleHandler() {

    $('#debugOff').click(function() {
      $('.debug').fadeOut('slow');

      $('#restoreDebug').show().delay(4500).fadeOut();
    });
  }

  function addPopulateFormHandler() {

    $('#populate').click(function() {

      $('.standards .numbersOnly').each(function(index){
        // var randomNum = Math.floor((Math.random() * 100) + 1)
        $(this).val(index);
      });

    //  $('.specIn').each(function(index){
    //   //  var randomNum = Math.floor((Math.random() * 10) + 1)
    //    $(this).val(index);
    //  });

     $('#deliveryDate').val('12/16/2017');
     $('#email').val('adam.romines@gmail.com');
     $('#debugEmail').val('adam.romines@gmail.com');
     $('#comments').val('TEST. These are some order comments comment comment comment . . . ');

     $($('.trigger-validation')[0]).keyup();

    });
  }

    function makeSomeInputsNumbersOnly() {
      $('.numbersOnly').keyup(function () {
        if (!this.value.match(/^([0-9]{0,3})$/)) {
          this.value = this.value.replace(/[^0-9]/g, '').substring(0,3);
        }
      });
    }

});