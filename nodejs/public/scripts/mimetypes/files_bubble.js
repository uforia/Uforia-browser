function render(api_call){
  var diameter = 800;

  var color = d3.scale.linear()
      .domain([-1, 5])
      .range(["hsl(152,80%,80%)", "hsl(228,30%,40%)"])
      .interpolate(d3.interpolateHcl);

  var pack = d3.layout.pack()
      .padding(2)
      .size([diameter - 20, diameter - 20])
      .value(function(d) { return d.size; })

  var svg = d3.select("#d3_visualization").append("svg")
	.attr("id", "d3_svg")
      .attr("width", diameter)
      .attr("height", diameter)
    .append("g")
      .attr("transform", "translate(" + diameter / 2 + "," + diameter / 2 + ")");

  //Call the api and handle the results
  d3.json(api_call, function(error, root) {
    if (error) return console.error(error);

	//Stop the loading spinner
	stopSpinner();

    // root = groupByUser(root.hits.hits);

    var focus = root,
        nodes = pack.nodes(root),
        view;

    var circle = svg.selectAll("circle")
        .data(nodes)
      .enter().append("circle")
        .attr("class", function(d) { return d.parent ? d.children ? "node" : "node node--leaf" : "node node--root"; })
        .style("fill", function(d) { return d.children ? color(d.depth) : null; })
        .on("click", function(d) { if (focus !== d) zoom(d), d3.event.stopPropagation(); });

    // Add the tooltip to node leaves
    var fileCircles = d3.selectAll(".node--leaf")
          .on("mouseover", mouseover)
          .on("mouseout", mouseout);

    var text = svg.selectAll("text")
        .data(nodes)
      .enter().append("text")
        .attr("class", "label")
        .style("fill-opacity", function(d) { return d.parent === root ? 1 : 0; })
        .style("display", function(d) { return d.parent === root ? null : "none"; })
        .text(function(d) { return d.name; });

    var node = svg.selectAll("circle,text");

    d3.select("body")
        .on("click", function() { zoom(root); });

    zoomTo([root.x, root.y, root.r]);

    function zoom(d) {
      var focus0 = focus; focus = d;

      var transition = d3.transition()
          .duration(d3.event.altKey ? 7500 : 750)
          .tween("zoom", function(d) {
            var i = d3.interpolateZoom(view, [focus.x, focus.y, focus.r]);
            return function(t) { zoomTo(i(t)); };
          });

      transition.selectAll("text")
        .filter(function(d) { return d.parent === focus || this.style.display === "inline"; })
          .style("fill-opacity", function(d) { return d.parent === focus ? 1 : 0; })
          .each("start", function(d) { if (d.parent === focus) this.style.display = "inline"; })
          .each("end", function(d) { if (d.parent !== focus) this.style.display = "none"; });
    }

    function zoomTo(v) {
      var k = root.r / v[2]; view = v;
      node.attr("transform", function(d) { return "translate(" + (d.x - v[0]) * k + "," + (d.y - v[1]) * k + ")"; });
      circle.attr("r", function(d) { return d.r * k; });
    }

    function mouseover(d, i){
      d3.select("#tooltip")
          .style("visibility", "visible")
          .html("Name: " + d.name + "<br />" + 
                         "Size: " + bytesToSize(d.size, false) + "<br />" +
                         "Owner: " + d.owner + "<br />" +
                         "Mtime: " + d.mtime + "<br />" +
                         "Atime: " + d.atime + "<br />" +
                         "Ctime: " + d.ctime + "<br />" +
                         "Mimetype: " + d.mtype)
          .style("left", (d3.event.pageX - 100) + "px")
          .style("top", (d3.event.pageY - 150) + "px");
    }

    function mouseout(d, i){
      d3.select("#tooltip").style("visibility", "hidden");
    }
  });

  function bytesToSize(bytes, onlySizeFormat) {
      var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
      if (bytes == 0) return 'n/a';
      var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
      if (i == 0) return bytes + ' ' + sizes[i]; 
    if (onlySizeFormat){
      return sizes[i];
    }else {
      return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + sizes[i];
    }
  }

  function timeConverter(UNIX_timestamp){
   var a = new Date(UNIX_timestamp*1000);
   var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
       var year = a.getFullYear();
       var month = months[a.getMonth()];
       var date = a.getDate();
       var hour = a.getHours();
       var min = a.getMinutes();
       var sec = a.getSeconds();
       var time = date+ " "+month+" "+year+" "+hour+":"+min+":"+sec ;
       return time;
   }


  d3.select(self.frameElement).style("height", diameter + "px");
}