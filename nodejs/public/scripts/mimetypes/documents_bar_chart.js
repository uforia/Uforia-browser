function render(api_call){
  var margin = {top: 20, right: 20, bottom: 60, left: 40},
    width = 960 - margin.left - margin.right,
    height = 500 - margin.top - margin.bottom;

  var x = d3.scale.ordinal()
      .rangeRoundBands([0, width], .1);

  var y = d3.scale.linear()
      .range([height, 0]);

  var xAxis = d3.svg.axis()
      .scale(x)
      .orient("bottom");

  var yAxis = d3.svg.axis()
      .scale(y)
      .orient("left");

  //Tooltip
  var tip = d3.tip()
    .attr('class', 'd3-tip')
    .offset([-10, 0])
    .html(function(d) {
    return "<strong>" + d.x + "</strong>" + 
    "<br /><strong>Value: </strong>" + d.y;
  });

  var svg = d3.select("#d3_visualization").append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
    .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  svg.call(tip);

  d3.json(api_call, function(error, data) {
    stopSpinner();
    if (error) {
      showMessage("An error occurred, please try another query");
      console.error(error);
      return;
    } 

    console.log(JSON.stringify(data));

    if(data.total == 0){
      showMessage("No results for this query")
      return;
    }

    //Set the max values for the x and y axis
    x.domain(data.values.map(function(d) { return d.x; }));
    var max = d3.max(data.values, function(d) { return +d.y; })
    y.domain([0, max]);
    yAxis.ticks(max);

    //add the X axis
    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis)
      .selectAll("text")
        .attr("transform", "translate(-20, 20) rotate(-45)");

    //Add the Y axis
    svg.append("g")
        .attr("class", "y axis")
        .call(yAxis)
      .append("text")
        .attr("transform", "rotate(-90)")
        .attr("dx", "-" + (height / 2) +  "px")
        .attr("dy", "-3em")
        .style("text-anchor", "left")
        .text(data.y_label);

    //Add the bars
    svg.selectAll(".bar")
        .data(data.values)
      .enter().append("rect")
        .attr("class", "bar")
        .attr("x", function(d) { return x(d.x); })
        .attr("width", x.rangeBand())
        .on("click", mouseclick)
        .on('mouseover', tip.show)
        .on('mouseout', tip.hide)
        .attr("height", "0px")
        .attr("y", height)
        .transition().duration(500)
        .attr("y", function(d) { return y(+d.y); })
        .attr("height", function(d) { return height - y(+d.y); });



    // //click on a bar
    function mouseclick(d){
      // var url = 'file_details?type=email&hashids=' + d.hashids.toString() + '&address1=' + d.x;
      // window.open(url, d.hashids.toString(),'height=768, width=1100, left=100, top=100, resizable=yes, scrollbars=yes, toolbar=no, menubar=no, location=no, directories=no, status=no, location=no');
    }
  });
}