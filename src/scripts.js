document.addEventListener("DOMContentLoaded", function(event) {

  addDebugToggleHandler();
  addPopulateFormHandler();
  makeSomeInputsNumbersOnly();
  validateSpecialtyQuantities();

  $( "#deliveryDate" ).datepicker();

  window.submitForm = submitForm;

  function submitForm(form) {
    google.script.run
    .withSuccessHandler(successConfirmation)
    .processForm(form);
    handleSubmitInUI();
  }

  function handleSubmitInUI(){
    window.scrollTo(0, 0);
    $('#myForm').hide();
    $('#standBy').show();
  }

  function successConfirmation(order) { //order.meta.orderHist

   /*
    * Makes an asynchronous call to 'asyncProcessing' function
    *
    * Populates 'output' div with confirmation message
    *
    */

    $('#standBy').hide();

    google.script.run.asyncProcessing(order);

    var message = '<p>Thank you for your submission. If you entered an email address for confirmation, you should receive an email shortly.<br> To review your order, please visit the <a href="' + order.meta.orderHist + '" target="_blank">Order History page</a>.</p>';


    $('#output').prepend(message).show();

  }


  function validateSpecialtyQuantities() {

    $('.specIn').focus(function() {

      var numRed = $('.specialty').find('input.red').length;

      if ($(this).hasClass('red')) {

        $(this).removeClass('red');

        if ( numRed == 1) {
          $('#qExceeded').hide();
        }

      }

    });

    $('.specIn').blur(function() {

      var inputVal = parseInt($(this).val(), 10);
      var availableQ = parseInt($(this).parent().prev().text(), 10);


      if (inputVal > availableQ) {
        $(this).addClass('red');
      }

      if ($('.specialty').find('input.red').length != 0) {
        $('#qExceeded').show();
      }

    });
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
    //    var randomNum = Math.floor((Math.random() * 10) + 1)
    //    $(this).val(randomNum);
    //  });
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