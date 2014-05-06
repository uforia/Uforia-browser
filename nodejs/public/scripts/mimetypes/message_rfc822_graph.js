function render(api_call){
  var width = 960,
    height = 600;

var color = d3.scale.category20();

var force = d3.layout.force()
    .charge(-400)
    .linkDistance(100)
    .size([width, height]);

var svg = d3.select("#d3_visualization").append("svg")
    .attr("id", "d3_svg")
    .attr("width", width)
    .attr("height", height);

d3.json(api_call, function(error, graph) {
  if (error) return console.error(error);

  console.log(JSON.stringify(graph));

  //Stop the loading spinner
  stopSpinner();

  var total = graph.total;

    force
      .nodes(graph.nodes)
      .links(graph.links)
      .start();

  var link = svg.selectAll(".link")
      .data(graph.links)
    .enter().append("line")
      .attr("class", "link")
      .style("stroke-width", function(d) { return Math.sqrt(d.value); });

  var node = svg.selectAll(".node")
      .data(graph.nodes)
    .enter().append("g")
      .attr("class", "node")
      .on("mouseover", mouseover)
      .on("mouseout", mouseout)
      .call(force.drag);

  var circle = node.append("circle")
      .attr("r", 8)
      .style("fill", function(d) { return color(d.name); });
   
  node.append("text")
      .attr("x", 12)
      .attr("dy", ".35em")
      .text(function(d) { return d.name; });

  force.on("tick", function() {
    link.attr("x1", function(d) { return d.source.x; })
        .attr("y1", function(d) { return d.source.y; })
        .attr("x2", function(d) { return d.target.x; })
        .attr("y2", function(d) { return d.target.y; });

    // node.attr("cx", function(d) { return d.x; })
    //     .attr("cy", function(d) { return d.y; });
        node
      .attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });
  });



  function mouseover(d, i) {
    d3.select(this).select("circle").transition()
        .duration(750)
        .attr("r", 16);

    d3.select("#tooltip")
      .style("visibility", "visible")
      .html(d.name + "<br/>"
             + "Sent " + d.sent + " out of " + total + " emails <br />"
             + "Received " + d.received + " emails")
      .style("top", function () { return (d3.event.pageY - 75)+"px"})
      .style("left", function () { return (d3.event.pageX - 60)+"px";});

  }

  function mouseout(d, i) {
    d3.select("#tooltip").style("visibility", "hidden");

    d3.select(this).select("circle").transition()
        .duration(750)
        .attr("r", 8);
  }

  function normalRadius(d){
    circle.transition()
      .duration(750)
      .attr("r", 8);
  }

  function receivedRadius(){
    circle.transition()
      .duration(750)
      .attr("r", function(d){
        if(d.received > 0) {
          return Math.sqrt(d.received * 100);
        } else {
          return Math.sqrt(1 * 100);
        }
      });
  }

  function sentRadius(d){
    circle.transition()
      .duration(750)
      .attr("r", function(d){
        if(d.sent > 0) {
          return Math.sqrt(d.sent * 100);
        } else {
          return Math.sqrt(1 * 100);
        }
      });
  }
});}