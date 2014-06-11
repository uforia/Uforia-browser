//Execute on page load 
var type = 'message_rfc822';
var view = 'chord';

function init(){
    //loadMimetypeAttributes(type, '.parameter');
    loadViewTypes(type);
    addParameter();
    showMessage("Enter a query");

    $("#parameters").on('click','.removeParam',function(){
        if($("#parameters").children().length > 1){
            $(this).parent().slideUp('fast', function(){
                $(this).remove();
            });
        } else {
            alert("Can't remove this search parameter");
        }
    });
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
    removeParameters();
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

function addParameter(){
    var param = $('<div class="param"><select class="paramField" onchange="loadResultCount()"><input class="paramQuery" type="text" onchange="loadResultCount()" onkeydown="loadResultCount()" onpaste="loadResultCount()" oninput="loadResultCount()" /><select class="paramOperator" onchange="loadResultCount()"><option value="must">Must match</option><option value="must_not">Must not match</option></select><input type="button" class="addParam" value="+" onclick="addParameter()" /><input type="button" class="removeParam" value="x"/></div>');
    param.appendTo("#parameters").hide().slideDown('fast');
    loadMimetypeAttributes(type, param.find("select.paramField"));
}

function removeParameters(){
    $('#parameters').empty();
    addParameter(); //There must always be at least one param
}

function loadMimetypeAttributes(type, element){
    $.get("api/mapping_info?type=" + type, function(data){
        element.find('option').remove().end();
        $(data).each(function(i, v){ 
            element.append($("<option>", { value: v, html: v }));
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

//Query ElasticSearch
function search(){
    //Clear the old SVG
    removeSVG();
    hideMessage();
    startSpinner();

    var api_call = "api/search?";
    var api_params = {
        'type' : type,
        'view' : view,
        'must' : [],
        'must_not' : [],
        'should' : []
    };
    var params = [];

    var parameters = $(".param").each(function(index){
        var field = $(this).find("select.paramField").val();
        var query = $(this).find('input.paramQuery').val()
        var operator = $(this).find("select.paramOperator").val();
        api_params[operator].push({'field' : field, 'query' : query});
    });

    api_call += $.param(api_params);
    render(api_call);
}

//Loads and displays the number of results a query has
function loadResultCount(){
    var api_call = "api/count?";
    var api_params = {
        'type' : type,
        'view' : view,
        'must' : [],
        'must_not' : [],
        'should' : []
    };
    var params = [];

    var parameters = $(".param").each(function(index){
        var field = $(this).find("select.paramField").val();
        var query = $(this).find('input.paramQuery').val()
        var operator = $(this).find("select.paramOperator").val();
        api_params[operator].push({'field' : field, 'query' : query});
    });

    api_call += $.param(api_params);
    $.get(api_call, function(data){
        $("#query_matches_count").text(data.count);
    });
}
