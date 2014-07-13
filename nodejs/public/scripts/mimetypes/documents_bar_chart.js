function render(api_call){

  d3.json(api_call, function(error, imports) {
    stopSpinner();
    if (error) {
      showMessage("An error occurred, please try another query");
      console.error(error);
      return;
    } 
  }
}
