function render(data, options, openDetails, cb){
  console.log(JSON.stringify(data));

  var margin = {top: 10, right: 10, bottom: 100, left: 40},
      margin2 = {top: 430, right: 10, bottom: 20, left: 40},
      width = 960 - margin.left - margin.right,
      height = 500 - margin.top - margin.bottom,
      height2 = 500 - margin2.top - margin2.bottom;

  var parseDate = d3.time.format("%Y-%m-%dT%H:%M:%S.%LZ").parse;

  var x = d3.time.scale().range([0, width]),
      x2 = d3.time.scale().range([0, width]),
      y = d3.scale.linear().range([height, 0]),
      y2 = d3.scale.linear().range([height2, 0]);

  var xAxis = d3.svg.axis().scale(x).orient("bottom"),
      xAxis2 = d3.svg.axis().scale(x2).orient("bottom"),
      yAxis = d3.svg.axis().scale(y).orient("left");

  var brush = d3.svg.brush()
      .x(x2)
      .on("brush", brushed);

  var area = d3.svg.area()
      .interpolate("monotone")
      .x(function(d) { return x(parseDate(d.x)); })
      .y0(height)
      .y1(function(d) { return y(d.y); });

  var area2 = d3.svg.area()
      .interpolate("monotone")
      .x(function(d) { return x2(parseDate(d.x)); })
      .y0(height2)
      .y1(function(d) { return y2(d.y); });

  var svg = d3.select("#d3_visualization").append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom);

  if(data.values.length == 0){
    cb({error: "No results for this query"});
    return;
  }

  svg.append("defs").append("clipPath")
      .attr("id", "clip")
    .append("rect")
      .attr("width", width)
      .attr("height", height);

  var focus = svg.append("g")
      .attr("class", "focus")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  var context = svg.append("g")
      .attr("class", "context")
      .attr("transform", "translate(" + margin2.left + "," + margin2.top + ")");

    x.domain(d3.extent(data.values.map(function(d) { return parseDate(d.x) })));
    y.domain([0, d3.max(data.values.map(function(d) { return d.y; }))]);
    x2.domain(x.domain());
    y2.domain(y.domain());

    focus.append("path")
        .datum(data.values)
        .attr("class", "area")
        .attr("d", area);

    focus.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis);

    focus.append("g")
        .attr("class", "y axis")
        .call(yAxis);

    context.append("path")
        .datum(data.values)
        .attr("class", "area")
        .attr("d", area2);

    context.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height2 + ")")
        .call(xAxis2);

    context.append("g")
        .attr("class", "x brush")
        .call(brush)
      .selectAll("rect")
        .attr("y", -6)
        .attr("height", height2 + 7);

  function brushed() {
    x.domain(brush.empty() ? x2.domain() : brush.extent());
    focus.select(".area").attr("d", area);
    focus.select(".x.axis").call(xAxis);
  }

  function isDate(val) {
    var d = new Date(val);
    return !isNaN(d.valueOf());
  }

  cb();
}