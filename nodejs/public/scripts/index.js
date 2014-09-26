//Execute on page load 
var type = 'email';
var view = 'chord';

function init(){
    loadTypes();
    loadViewTypes(type);
    addParameter();
    showMessage("Enter a query");

    $("#parameters").on('click','.removeParam',function(){
        if($("#parameters").children().length > 1){
            $(this).parent().slideUp('fast', function(){
                $(this).remove();
                loadResultCount();
            });
        } else {
            alert("Can't remove this search parameter");
        }
    });
}

//Load the right css for the right D3 visualisation
function changeType(select){
    type = select.value;

    switch(select.value){
        case "files":
            view = 'bubble';
            break;
        case "email":
            view = 'chord';
            break; 
        case "documents":
            view = 'bar_chart';
            break;
        default:
            type = 'email';
            view = 'chord';
            break;
    }

    //Clear the visualization and search parameters
    loadViewTypes(type);
    removeSVG();
    removeParameters();
    changeScripts();
    loadResultCount();
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
    $('#d3_visualization').empty();
}

// Add a search parameter
function addParameter(){
    var param = $('<div class="param"></div>');
    var paramField = $('<select class="paramField" onchange="loadResultCount();changeParamType($(this).parent());"></select>');
   
    //If you change this also change it in changeParamType()
    var paramQuery = $('<input class="paramQuery" type="text" placeholder="Query" onchange="loadResultCount()" onkeydown="loadResultCount()" onpaste="loadResultCount()" oninput="loadResultCount()" />');
    
    var paramOperator = $('<select class="paramOperator" onchange="loadResultCount()"><option value="must">Must match</option><option value="must_not">Must not match</option></select>');
    var paramAdd = $('<input type="button" class="addParam" value="+" onclick="addParameter()" />');
    var paramRemove = $('<input type="button" class="removeParam" value="x"/>');

    param.append(paramField);
    param.append(paramOperator);
    param.append(paramQuery);
    param.append(paramAdd);
    param.append(paramRemove);

    param.appendTo("#parameters").hide().slideDown('fast');
    loadMimetypeAttributes(type, param.find("select.paramField"));
}

//This function decides wether a parameter should be a normal query or a date input and changes it if necessary
function changeParamType(element){
    var type = element.find('.paramField').find(":selected").data('type');

    if(type == 'date'){
        //Remove the query field and add the date fields
        if(element.find('.paramQuery').length != 0){
            var queryField = element.find('.paramQuery');
            queryField.hide().fadeOut("slow", function(){
                $(this).remove();
            });
            var paramStartDate = $('<input class="paramStartDate paramDateField" type="text" placeholder="Start date" onchange="loadResultCount()" onkeydown="loadResultCount()" onpaste="loadResultCount()" oninput="loadResultCount()" />').datepicker({ dateFormat: 'dd M yy', changeYear : true , changeMonth : true, yearRange : "-50:+1"});
            var paramEndDate = $('<input class="paramEndDate paramDateField" type="text" placeholder="End date" onchange="loadResultCount()" onkeydown="loadResultCount()" onpaste="loadResultCount()" oninput="loadResultCount()" />').datepicker({ dateFormat: 'dd M yy', changeYear : true , changeMonth : true, yearRange : "-50:+1"});
            paramStartDate.insertAfter(element.find('.paramOperator'));
            paramStartDate.hide().fadeIn("slow");
            paramEndDate.insertAfter(element.find('.paramStartDate'));
            paramEndDate.hide().fadeIn("slow");
        }
    } else {
        if(element.find('.paramStartDate').length != 0 && element.find('.paramEndDate').length != 0){
            var startDateField = element.find('.paramStartDate');
            var endDateField = element.find('.paramEndDate');
            startDateField.hide().fadeOut("slow", function(){
                $(this).remove();
            });
            endDateField.hide().fadeOut("slow", function(){
                $(this).remove();
            });

            var paramQuery = $('<input class="paramQuery" type="text" placeholder="Query" onchange="loadResultCount()" onkeydown="loadResultCount()" onpaste="loadResultCount()" oninput="loadResultCount()" />');
            paramQuery.insertAfter(element.find('.paramOperator'));
            paramQuery.hide().fadeIn("slow");
        }
    }
}

//Remove all search parameters
function removeParameters(){
    $('#parameters').empty();
    addParameter(); //There must always be at least one param
    loadResultCount();
}

//Load the fields per mapping
function loadMimetypeAttributes(type, element){
    $.get("api/mapping_info?type=" + type, function(data){
        element.find('option').remove().end();
        Object.keys(data).forEach(function(key){
            element.append($("<option>", { value: key, text: key, data : { 'type' : data[key].type}}));
        });

        //Check if it's a date field, if so change it to a date layout
        changeParamType(element.parent());
    });
}

function loadTypes(){
    var select = $('#search_type');
    $.get("api/get_types", function(data){
        select.find('option').remove().end();

        $.each(data, function(key, value) {
                select
                    .append($('<option>', { value : key})
                    .text(value['name'])); 
        });
    });
}

//Load the available view types (visualizations) per mapping
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
        'parameters' : {
            'must' : [],
            'must_not' : []
        },
        'filters' : {
            'must' : [],
            'must_not' : []
        }
    };

	//Get all the search parameters and add them to the query object.
    $(".param").each(function(index){
        var field = $(this).find("select.paramField").val();
        var operator = $(this).find("select.paramOperator").val();

        //Check wether it's a query or date param
        if($(this).find('input.paramStartDate').length != 0 && $(this).find('input.paramEndDate').length != 0){
            var startDate = new Date($(this).find('input.paramStartDate').val());
            var endDate = new Date($(this).find('input.paramEndDate').val());
            api_params.filters[operator].push({'field' : field, 'start_date' : startDate.getTime(), 'end_date' :  endDate.getTime()});
        } else if($(this).find('input.paramQuery').length != 0){
            var query = $(this).find('input.paramQuery').val();
            api_params.parameters[operator].push({'field' : field, 'query' : query});
        }
    });

    loadResultCount();
    api_call += $.param(api_params);
    render(api_call);
}

//Loads and displays the number of results a query has
function loadResultCount(){
    var api_call = "api/count?";
    var api_params = {
        'type' : type,
        'view' : view,
        'parameters' : {
            'must' : [],
            'must_not' : []
        },
        'filters' : {
            'must' : [],
            'must_not' : []
        }
    };

    //Get all the search parameters and add them to the query object.
    $(".param").each(function(index){
        var field = $(this).find("select.paramField").val();
        var operator = $(this).find("select.paramOperator").val();

        //Check wether it's a query or date param
        if($(this).find('input.paramStartDate').length != 0 && $(this).find('input.paramEndDate').length != 0){
            var startDate = new Date($(this).find('input.paramStartDate').val());
            var endDate = new Date($(this).find('input.paramEndDate').val());
            api_params.filters[operator].push({'field' : field, 'start_date' : startDate.getTime(), 'end_date' :  endDate.getTime()});
        } else if($(this).find('input.paramQuery').length != 0){
            var query = $(this).find('input.paramQuery').val();
            api_params.parameters[operator].push({'field' : field, 'query' : query});
        }
    });

    api_call += $.param(api_params);
    $.get(api_call, function(data){
        $("#query_matches_count").text(data.count);

        if(data.count <= 100){
            $(".matchesBox").css('box-shadow', '0px 0px 10px green');
        } else if(data.count > 100 && data.count <= 200){
            $(".matchesBox").css('box-shadow', '0px 0px 10px orange');
        } else if (data.count > 200) {
            $(".matchesBox").css('box-shadow', '0px 0px 10px red');
        } else {
            $(".matchesBox").css('box-shadow', '');
        }
    });
}
