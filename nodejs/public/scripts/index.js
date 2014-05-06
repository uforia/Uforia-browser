//Execute on page load 
var type = 'files';
var view = 'bubble';

function init(){
    //loadFieldCollapseFields(type);
	loadViewTypes(type);
}

//Load the right css for the right D3 visualisation
function changeType(select){
    switch(select.value){
        case "files":
            type = 'files';
		view = 'bubble';
            break;
        case "message_rfc822":
            type = 'message_rfc822';
		view = 'chord';
            break; 
        default:
            type = 'files';
            break;
    }

    removeSVG();
    //loadFieldCollapseFields(type);
	loadViewTypes(type);
	changeScripts();
	search();
}

//Load a different view for the same mimetype
function changeView(select){
	view = select.value;
	changeScripts();
	search();
}

//Changes the d3 script file and d3 css file for the new visualization
function changeScripts(){
    $('#d3_script').replaceWith("<script src=\"scripts/mimetypes/" + type + "_" + view + ".js\" type=\"text/javascript\" id=\"d3_script\"></script>");
    $('#d3_style').replaceWith("<link href=\"css/mimetypes/" + type + "_" + view +  ".css\" rel=\"stylesheet\" type=\"text/css\" id=\"d3_style\">");
}

//clear the d3 svg from the page
function removeSVG(){
    //$('#d3_svg').remove();
	$('#d3_visualization').empty();
}

function loadFieldCollapseFields(type){
    var input = $('#field_collapse');
    $.get("api/mapping_info?type=" + type, function(data){
        input.find('option').remove().end();
        $(data).each(function(i, v){ 
            input.append($("<option>", { value: v, html: v }));
        });
    });
}

function loadViewTypes(type){
	var select = $('#view_type')
	$.get("api/view_info?type=" + type, function(data){
		select.find('option').remove().end();
		$.each(data, function(key, value) {   
     			$('#view_type')
          			.append($('<option>', { value : key })
          			.text(value)); 
		});
	});
}

function startSpinner(){
    spinner.spin(target);
}

function stopSpinner(){
    spinner.stop();
}

function showMessage(message){
    $("#message").text(message);
    $("#message").attr("style", "visibility: visible")
}

function hideMessage(){
    $("#message").empty();
    $("#message").attr("style", "visibility: hidden")
}

//Init the elasticsearch query
function search(){
    //Clear the old SVG
    removeSVG();
    hideMessage();
    startSpinner();

    //Get the values from the input fields
    var api_call = "api/search?";
    var query = $('#search_query').val();
    if(jQuery.trim(query).length > 0)
    {
        api_call += 'q=' + query + '&';         
    }

    var type = $('#search_type').val();
    var size = 'all';
    api_call += 'type=' + type + '&';
    api_call += 'view=' + view + '&';
    api_call += 'size=' + size;

    //Send this to the corresponding d3 script to load
    render(api_call);
}