function render(data, options, openDetails, cb){
  if(data.values.length == 0){
    cb({error: "No results for this query"});
    return;
  }

  console.log(JSON.stringify(data));

  /*  Margin, Width and height */
  var margin = {top: 20, right: 20, bottom: 30, left: 50, mid: 20};
  var width = $('#d3_visualization').width() - margin.left - margin.right;
  var miniHeight = 60;
  var height = 600 - margin.top - margin.mid - miniHeight - margin.bottom;

  var selected;

  var svg = d3.select("#d3_visualization").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.mid + miniHeight + margin.bottom);

  var barsGroup = svg.append('g')
            .attr("class","barsGroup")
            .attr("transform","translate(" + margin.left + "," + margin.top + ")");

  var miniGroup = svg.append('g')
            .attr("class","miniGroup")
            .attr("transform","translate(" + margin.left + "," + (margin.top + height + margin.mid) + ")");

  var brushGroup = svg.append('g')
            .attr("class","brushGroup")
            .attr("transform","translate(" + margin.left + "," + (margin.top + height + margin.mid) + ")");

  //Tooltip
  var tip = d3.tip()
    .attr('class', 'd3-tip')
    .offset([-10, 0])
    .html(function(d) {
    return "<strong>" + data.x_label + ": </strong>" + d.x  + 
    "<br /><strong>" + data.y_label + ": </strong>" + d.y;
  });

  barsGroup.call(tip);

  /*  Scales */
  var axisRange = d3.range(data.values.length);

  axisRange.shift();

  axisRange.push((axisRange[axisRange.length - 1] + 1));

  var yScale = d3.scale.linear()
    .range([height, 0])
    .domain([0, d3.max(data.values, function(d) { 
      return d.y;
    })]);

  var yScale2 = d3.scale.linear()
    .range([miniHeight, 0])
    .domain([0, d3.max(data.values, function(d) { 
      return d.y;
    })]);

  var xScale = d3.scale.ordinal()
    .rangeBands([0, width], 0.4, 0)
    .domain(d3.range(data.values.length));

  var xScaleBrush = d3.scale.ordinal()
    .rangeBands([0, width], 0.4, 0)
    .domain(d3.range(data.values.length));

  var xScaleAxis = d3.scale.ordinal()
    .rangeBands([0, width], 0.4, 0)
    .domain(axisRange);

  /*  Define y axis */
  var yAxis = d3.svg.axis()
    .scale(yScale)
    .tickSize(-width, -width)
    .ticks(4)
    .orient("left");

  /* Define y axis */
  var xAxis = d3.svg.axis()
    .scale(xScaleAxis)
    // .tickSize(3,0)
    // .tickValues([1,10,20,30,40,50,60,70,80,90,100])
    .orient("bottom");

  /*  Prepare the y axis but do not call .call(xAxis) yet */
  svg.append("g")
    .attr("class", "y axis")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
    .append("g")
    .attr("class", "axisLabel")
    .append("text")
    .attr("transform", "translate(" + -(margin.left * 0.8) + "," + (height/2) + "), rotate(-90)")
    .style("text-anchor", "middle")
    .text(data.y_label);

  /* Prepare the x axis */
  svg.append("g")
    .attr("class","x axis")
    .attr("transform", "translate(" + margin.left + "," + (margin.top + height + margin.mid + miniHeight) + ")" )
    .call(xAxis)
    .append("g")
    .attr("class", "axisLabel")
    .append("text")
    .attr("transform", "translate(" + (width/2) + "," + margin.bottom + ")")
    .style("text-anchor", "middle") 
    .text(data.x_label);

  /* brush */
  var brush = d3.svg.brush()
          .x(xScaleBrush)
          .extent([0, width])
          .on("brush", display);

  brushGroup.append("g")
    .attr("class", "brush")
    .call(brush)
    .selectAll("rect")
    .attr("opacity", 0.5)
    .attr("height", miniHeight);

  function display () {
    selected =  xScaleBrush.domain()
                .filter(function(d){
                  return (brush.extent()[0] <= xScaleBrush(d)) && (xScaleBrush(d) <= brush.extent()[1]);
                });

    var start;
    var end;

    /* Keep a minimum amount of bars on there to avoid any jank */
    if (selected.length > 2 ) {
      start = selected[0];
      end = selected[selected.length - 1] + 1;
    } else {
      start = 0;
      end = data.values.length;
    }

    var updatedData = data.values.slice(start, end);

    // console.log(JSON.stringify(updatedData));
    updateBars(updatedData);
  }

  function update (grp, data, main) {
    grp.selectAll("rect").data(data)
      .attr("x", function (d, i) { return xScale(i); })
      .attr("width", function (d) { return xScale.rangeBand(); })
      .attr("y", function (d){ return main ? yScale(d.y) : yScale2(d.y); })
      .attr("height", function (d) { return main ? height - yScale(d.y) : miniHeight; });
  }

  function enter (grp, data, main) {
    grp.selectAll("rect").data(data)
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("x", function (d, i) { return xScale(i);})
      .attr("width", function(d) { return xScale.rangeBand(); })
      .attr("y", function (d){ return main ? yScale(d.y) : yScale2(d.y)})
      .attr("height", function (d) { return main ? height - yScale(d.y) : miniHeight - yScale2(d.y);})
      .attr("opacity", function () { return 1; })
      .on("click", mouseclick)
      .on('mouseover', tip.show)
      .on('mouseout', tip.hide);
  }

  function exit (grp, data) {
    grp.selectAll("rect").data(data).exit().remove();
  }

  function updateBars (data) {

    xScale.domain(d3.range(data.length));
    yScale.domain([0, d3.max(data, function(d) { return d.y;})]);

    /* Update */
    update(barsGroup, data, true);

    /* Enter… */
    enter(barsGroup, data, true);

    /* Exit */
    exit(barsGroup, data);

    /* Call the Y axis to adjust it to the new scale */
    svg.select(".y")
      .transition()
      .duration(10)
      .call(yAxis);
  }

  function mouseclick(d){
    openDetails({hashids: d.hashids, adressses:[d.x], tables: d.tables});
  }

  enter(miniGroup, data.values, false);
  updateBars(data.values);
  cb();
}