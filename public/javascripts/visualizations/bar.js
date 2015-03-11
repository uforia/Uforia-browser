function render(data, options, openDetails, cb){
  var margin = {top: 20, right: 20, bottom: 60, left: 40},
    width = $('#d3_visualization').width(),
    height = options.height || window.innerHeight;

  var dateFormat = d3.time.format('%d-%m-%Y');

  var x = d3.scale.ordinal()
      .rangeRoundBands([0, width], .1);

  var y = d3.scale.linear()
      .range([height, 0]);

  var xAxis = d3.svg.axis()
      .scale(x)
      .orient("bottom")
      .tickFormat(function(d) { return isDate(d) ? dateFormat(new Date(d)) : d; });

  var yAxis = d3.svg.axis()
      .scale(y)
      .orient("left");

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
    .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  svg.call(tip);

  // console.log(JSON.stringify(data));

  if(data.values.length == 0){
    cb({error: "No results for this query"});
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



  //click on a bar
  function mouseclick(d){
    openDetails({hashids: d.hashids, adressses:[d.x], tables: d.tables});
  }

  function isDate(val) {
    var d = new Date(val);
    return !isNaN(d.valueOf());
  }

  cb();
}

