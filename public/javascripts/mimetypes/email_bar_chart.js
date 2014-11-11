function render(data, options, openDetails, cb){
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
    return "<strong>Date: </strong>" + d.date  + 
    "<br /><strong>Emails: </strong>" + d.total;
  });

  var svg = d3.select("#d3_visualization").append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
    .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  svg.call(tip);

  console.log(JSON.stringify(data));

  if(data.total == 0){
    cb({error: "No results for this query"});
    return;
  }

  //Set the max values for the x and y axis
  x.domain(data.dates.map(function(d) { return d.date; }));
  var max = d3.max(data.dates, function(d) { return +d.total; })
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
      .text("Emails sent");

  //Add the bars
  svg.selectAll(".bar")
      .data(data.dates)
    .enter().append("rect")
      .attr("class", "bar")
      .attr("x", function(d) { return x(d.date); })
      .attr("width", x.rangeBand())
      .on("click", mouseclick)
      .on('mouseover', tip.show)
      .on('mouseout', tip.hide)
      .attr("height", "0px")
      .attr("y", height)
      .transition().duration(500)
      .attr("y", function(d) { return y(+d.total); })
      .attr("height", function(d) { return height - y(+d.total); });



  //click on a bar
  function mouseclick(d){
    openDetails({hashids: d.hashids, adressses:[d.date]});
  }
  cb();
}