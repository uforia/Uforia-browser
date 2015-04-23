var circle;
var state = 0; // 0 is normal, 1 is radius size sent, 2 is radius size received;
var force;

function render(data, options, openDetails, cb){
  var width = $('#d3_visualization').width(),
    height = options.height || window.innerHeight;

  var color = d3.scale.category20();

  force = d3.layout.force()
      .linkDistance(50)
      .charge(-400)
      .size([width, height]);

  //Add button to the layout
  var div = d3.select("#d3_visualization").append("div").attr("id", "d3_button_bar");

  $("#d3_button_bar").append("<input type='button' value='Normal radius' onclick='normalRadius();' />");
  $("#d3_button_bar").append("<input type='button' value='Radius by Sent' onclick='sentRadius();' />");
  $("#d3_button_bar").append("<input type='button' value='Radius by Received' onclick='receivedRadius();' />");

  var svg = d3.select("#d3_visualization").append("svg")
      .attr("id", "d3_svg")
      .attr("width", width)
      .attr("height", height);

  // console.log(JSON.stringify(data));

  if(data.total == 0){
    cb({error: "No results for this query"});
    return;
  }

  var total = data.total;

  var tablesByIndex = d3.map();
  //Calculate the gravity based on the number of results, more results should give a higher gravity 
  //This is to ensure that all the nodes will remain within the view bounds
  var gravity = Math.sqrt(total) / 30 < 0.1 ? 0.1 : Math.sqrt(total) / 30;

  force
    .gravity(gravity)
    .nodes(data.nodes)
    .links(data.links);

// build the arrow.
svg.append("svg:defs").selectAll("marker")
    .data(force.links())
  .enter().append("svg:marker") // This section adds in the arrows
    .attr("id", function(d){return "marker_" + d.source + "_" + d.target; })
    .attr("viewBox", "0 -5 10 10")
    .attr("refX", 10) //10 for marker size + 8 for initial circle radius
    .attr("refY", 0)
    .attr("markerWidth", 6)
    .attr("markerHeight", 6)
    .attr("orient", "auto")
    .attr("class", "marker")
  .append("svg:path")
    .attr("d", "M0,-5L10,0L0,5");

// add the links and the arrows
var path = svg.append("svg:g").selectAll("path")
    .data(force.links())
  .enter().append("svg:path")
    .attr("class", "link")
    .attr("marker-end", function(d){return "url(#marker_" + d.source + "_" + d.target + ")"; })
    .on("click", mouseclickLink);

  //Add the nodes
  var node = svg.selectAll(".node")
      .data(data.nodes)
    .enter().append("g")
      .attr("class", "node")
      .attr("r", function(d){ return d.radius = 8;})
      .on("mouseover", mouseover)
      .on("mouseout", mouseout)
      .on("click", mouseclick)
      .call(force.drag());

  //Give each node a circle
  circle = node.append("circle")
      .attr("r", 8)
      .style("fill", function(d) { return color(d.name); });
   
  //Give each node a label
  node.append("text")
      .attr("x", 12)
      .attr("dy", ".35em")
      .text(function(d) { return d.name; });

  force.on("tick", function() {
       path.attr("d", function(d) {
            // Total difference in x and y from source to target
            diffX = d.target.x - d.source.x;
            diffY = d.target.y - d.source.y;

            // Length of path from center of source node to center of target node
            pathLength = Math.sqrt((diffX * diffX) + (diffY * diffY));

            // x and y distances from center to outside edge of target node
            offsetX = (diffX * d.target.radius) / pathLength;
            offsetY = (diffY * d.target.radius) / pathLength;
            return "M" + d.source.x + "," + d.source.y + "L" + (d.target.x - offsetX) + "," + (d.target.y - offsetY)
        });

    node.attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });
  });

  force.on("end", function(d){
    data.nodes.forEach(function(d) { d.fixed = true; });
  });

  setInitialPositions();

  function mouseover(d, i) {
    if(state == 0){
      d3.select(this).select("circle").transition()
          .duration(750)
          .attr("r", function(d){return d.radius = 16;});
    }
  }

  function mouseout(d, i) {
    if(state == 0){
      d3.select(this).select("circle").transition()
          .duration(750)
          .attr("r", function(d){return d.radius = 8;});
    }
  }

  //click on a node
  function mouseclick(d){
    if (d3.event.defaultPrevented) return; //prevent a click event when a node is dragged
    openDetails({hashids: d.hashids, adressses:[d.name], tables: d.tables});
  }

  //For clicks on a link
  function mouseclickLink(d){
    openDetails({hashids: d.hashids, adressses:[d.name], tables: d.tables});
  }

  function setInitialPositions(){
    var n = data.nodes.length
    // Initialize the positions deterministically, for better results.
    data.nodes.forEach(function(d, i) { d.x = d.y = width / n * i; });

    // Run the layout a fixed number of times.
    // The ideal number of times scales with graph complexity.
    force.start();
    for (var i = n; i > 0; --i) force.tick();
    force.stop();

    // Center the nodes in the middle.
    var ox = 0, oy = 0;
    data.nodes.forEach(function(d) { ox += d.x, oy += d.y; });
    ox = ox / n - width / 2, oy = oy / n - height / 2;
    data.nodes.forEach(function(d) { d.x -= ox, d.y -= oy; });

    force.resume();
  }

  cb(); // send callback, no errors
}

//Transition to the normal node size
function normalRadius(){
  if(state != 0){
    circle.transition()
      .duration(750)
      .attr("r", function(d){return d.radius = 8;});
    state = 0;
    force.resume();
  } 
}

//Transition the node radius to display the largest receivers
function receivedRadius(){
  if(state != 2){
    circle.transition()
      .duration(750)
      .attr("r", function(d){
        if(d.received > 0) {
          return d.radius = Math.sqrt(d.received * 100);
        } else {
          return d.radius = Math.sqrt(1 * 100);
        }
      });
    state = 2;
    force.resume();
  }
}

//Transition the node radius to display the largest senders
function sentRadius(){
  if(state != 1){
    circle.transition()
      .duration(750)
      .attr("r", function(d){
        if(d.sent > 0) {
          return d.radius = Math.sqrt(d.sent * 100);
        } else {
          return d.radius= Math.sqrt(1 * 100);
        }
      });
    state = 1;
    force.resume();
  }
}