function render(data, options, openDetails, cb){
  var margin = {top: 20, right: 20, bottom: 20, left: 40},
    width = $('#d3_visualization').width(),
    height = (options.height || window.innerHeight),
    heightContext = 90,
    heightFocus = height - heightContext - 20,
    margin2 = {top: (heightFocus + margin.top + 20), right: 20, bottom: 20, left: 40};

  var dateFormat = d3.time.format("%Y-%m-%dT%H:%M:%S.%LZ");
  var parseDate = d3.time.format("%Y-%m-%dT%H:%M:%S.%LZ").parse;

  if(data.values.length == 0){
    cb({error: "No results for this query"});
    return;
  }

  var x, x2;

  setScaleType(data.values[0].x);

  var y = d3.scale.linear()
      .range([heightFocus, 0]);
      y2 = d3.scale.linear()
      .range([heightContext, 0]);

  var xAxis = d3.svg.axis()
      .scale(x)
      .orient("bottom"),
      // .tickFormat(function(d) { return isDate(d) ? dateFormat(new Date(d)) : d; }),
      xAxis2 = d3.svg.axis()
      .scale(x2)
      .orient("bottom")
      .tickFormat(function(d) { return isDate(d) ? dateFormat(new Date(d)) : d; });

  var yAxis = d3.svg.axis()
      .scale(y)
      .orient("left");
  var yAxis2 = d3.svg.axis()
      .scale(y2)
      .orient("left");

  var brush = d3.svg.brush()
    .x(x2)
    .on("brush", brushed);

  //Tooltip
  var tip = d3.tip()
    .attr('class', 'd3-tip')
    .offset([-10, 0])
    .html(function(d) {
    return "<strong>" + data.x_label + ": </strong>" + d.x  + 
    "<br /><strong>" + data.y_label + ": </strong>" + d.y;
  });

  var svg = d3.select("#d3_visualization").append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
  
  var focus = svg.append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  var context = svg.append("g")
      .attr("transform", "translate(" + margin2.left + "," + margin2.top + ")");

  focus.call(tip);

  //Set the max values for the x and y axis
  x.domain(data.values.map(function(d) { return d.x; }));
  x2.domain(data.values.map(function(d) { return d.x; }));
  var max = d3.max(data.values, function(d) { return +d.y; })
  y.domain([0, max]);
  y2.domain([0, max]);
  yAxis.ticks(max);
  yAxis2.ticks(max);

  //add the X axis
  focus.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + heightFocus + ")")
      .call(xAxis);
    // .selectAll("text")
    //   .attr("transform", "translate(-20, 20) rotate(-45)");

  //Add the Y axis
  focus.append("g")
      .attr("class", "y axis")
      .call(yAxis)
    .append("text")
      .attr("transform", "rotate(-90)")
      .attr("dx", "-" + (heightFocus / 2) +  "px")
      .attr("dy", "-3em")
      .style("text-anchor", "left")
      .text(data.y_label);

  //Add the bars
  focus.selectAll(".bar")
      .data(data.values)
    .enter().append("rect")
      .attr("class", "bar")
      .attr("x", function(d) { return x(d.x); })
      .attr("width", 100)
      .on("click", mouseclick)
      .on('mouseover', tip.show)
      .on('mouseout', tip.hide)
      .attr("height", "0px")
      .attr("y", heightFocus)
    .transition().duration(500)
      .attr("y", function(d) { return y(+d.y); })
      .attr("height", function(d) { return heightFocus - y(+d.y); });

  context.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + heightContext + ")")
      .call(xAxis);

  //uncomment for a y axis on the bottom 'context' bar chart
  context.append("g")
      .attr("class", "y axis")
      .call(yAxis2)
    .append("text")
      .attr("transform", "rotate(-90)")
      .attr("dx", "-" + (heightContext / 2) +  "px")
      .attr("dy", "-3em")
      .style("text-anchor", "left")
      .text(data.y_label);

  context.selectAll(".contextBar")
      .data(data.values)
    .enter().append("rect")
      .attr("class", "contextBar")
      .attr("x", function(d) { return x2(d.x); })
      .attr("width", 10)
      .attr("height", "0px")
      .attr("y", heightFocus)
      .transition().duration(500)
      .attr("y", function(d) { return y2(+d.y); })
      .attr("height", function(d) { return heightContext - y2(+d.y); });

  context.append("g")
      .attr("class", "x brush")
      .call(brush)
    .selectAll("rect")
      .attr("y", -6)
      .attr("height", heightContext + 7);

  function brushed() {
    x.domain(brush.empty() ? x2.domain() : brush.extent());
    focus.selectAll(".bar").attr("transform", function(d) { 
      console.log(x(d.x))
      return "translate(" + x(d.x) + ",0)"; })
    focus.select(".x.axis").call(xAxis);
  }

  //click on a bar
  function mouseclick(d){
    openDetails({hashids: d.hashids, adressses:[d.x], tables: d.tables});
  }

  function isDate(val) {
    var d = new Date(val);
    return !isNaN(d.valueOf());
  }

  //Determines wether the x axis is a date or some other value and set the x domain accordingly
  function setScaleType(val){
    if(isDate(val)){
        x = d3.time.scale().range([0, width]);
        x2 = d3.time.scale().range([0, width]);
    }  else {
        x = d3.scale.ordinal().rangeRoundBands([0, width], .1);
        x2 = d3.scale.ordinal().rangeRoundBands([0, width], .1);
    }


    //Default to ordinal for testing -- REMOVE THIS LATER
    x = d3.scale.ordinal().rangeRoundBands([0, width], .1);
    x2 = d3.scale.ordinal().rangeRoundBands([0, width], .1);
  }
  cb();
}

