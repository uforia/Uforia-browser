function render(api_call){
  var outerRadius = 900 / 2,
      innerRadius = outerRadius - 130;

  var fill = d3.scale.category20c();

  var chord = d3.layout.chord()
      .padding(.04)
      .sortSubgroups(d3.descending)
      .sortChords(d3.descending);

  var arc = d3.svg.arc()
      .innerRadius(innerRadius)
      .outerRadius(innerRadius + 20);

  var svg = d3.select("#d3_visualization").append("svg")
      .attr("id", "d3_svg")
      .attr("width", outerRadius * 2)
      .attr("height", outerRadius * 2)
    .append("g")
      .attr("id", "circle")
      .attr("transform", "translate(" + outerRadius + "," + outerRadius + ")");

  svg.append("circle")
    .attr("r", innerRadius);

  d3.json(api_call, function(error, imports) {
    if (error) {
      showMessage("An error occurred, please try another query");
      stopSpinner();
      return console.error(error);
    } 

    console.log(JSON.stringify(imports));

    if(imports.total == 0){
      showMessage("No results for this query")
      stopSpinner();
      return;
    }
    stopSpinner();

    var total = imports.total;
    // imports = imports.data;

    var indexByName = d3.map(),
        nameByIndex = d3.map(),
        matrix = imports.matrix,
        n = 0;

    // Compute a unique index for each package name.
    imports.names.forEach(function(d) {
      d = d.name;
      if (!indexByName.has(d)) {
        nameByIndex.set(n, d);
        indexByName.set(d, n++);
      }
    });

    chord.matrix(matrix);
 
    var g = svg.selectAll(".group")
        .data(chord.groups)
      .enter().append("g")
        .attr("class", "group")
        .on("mouseout", mouseout)
        .on("mouseover", mouseover);

    var groupPath = g.append("path")
        .attr("id", function(d, i) { return "group" + i; })
        .style("fill", function(d) { return fill(d.index); })
        .style("stroke", function(d) { return fill(d.index); })
        .attr("d", arc);


    //The commented code below will put the label in the arc instead of behind it
    // var groupText = g.append("text")
    //     .attr("x", 6)
    //     .attr("dy", 15);

    // groupText.append("textPath")
    //     .attr("xlink:href", function(d, i) { return "#group" + i; })
    //     .text(function(d, i) { return nameByIndex.get(d.index); });

    // // Remove the labels that don't fit. :(
    // groupText.filter(function(d, i) { return groupPath[0][i].getTotalLength() / 2 - 16 < this.getComputedTextLength(); })
    //     .remove();

    g.append("text")
        .each(function(d) { d.angle = (d.startAngle + d.endAngle) / 2; })
        .attr("dy", ".35em")
        .attr("transform", function(d) {
          return "rotate(" + (d.angle * 180 / Math.PI - 90) + ")"
              + "translate(" + (innerRadius + 26) + ")"
              + (d.angle > Math.PI ? "rotate(180)" : "");
        })
        .style("text-anchor", function(d) { return d.angle > Math.PI ? "end" : null; })
        .text(function(d) { return nameByIndex.get(d.index); });

    var chords = svg.selectAll(".chord")
        .data(chord.chords)
      .enter().append("path")
        .attr("class", "chord")
        .style("stroke", function(d) { return d3.rgb(fill(d.source.index)).darker(); })
        .style("fill", function(d) { return fill(d.source.index); })
        .attr("d", d3.svg.chord().radius(innerRadius))
        .on("mouseover", function(d){
          d3.select("#tooltip")
            .style("visibility", "visible")
            .html(chordTip(d))
            .style("top", function () { return (d3.event.pageY - 75)+"px"})
            .style("left", function () { return (d3.event.pageX - 60)+"px";})
        })
        .on("mouseout", mouseout)
        .on("click", mouseclick);

    function mouseover(d, i) {
      d3.select("#tooltip")
        .style("visibility", "visible")
        .html(groupTip(d))
        .style("top", function () { return (d3.event.pageY - 75)+"px"})
        .style("left", function () { return (d3.event.pageX - 60)+"px";})

      chords.classed("chord--fade", function(p) {
        return p.source.index != i
            && p.target.index != i;
      });
    }

    function mouseout(d, i){
      d3.select("#tooltip").style("visibility", "hidden")
    }

    function mouseclick(d){
      // var params = $.param({ type :  'message_rfc822', hashids : imports.hashids[d.source.index][d.target.index]})
      var url = 'file_details?type=message_rfc822&hashids=' + imports.hashids[d.source.index][d.target.index].toString() + '&address1=' + nameByIndex.get(d.source.index) + '&address2=' + nameByIndex.get(d.target.index);
      window.open(url, imports.hashids[d.source.index][d.target.index].toString(),'height=768, width=1000, left=100, top=100, resizable=yes, scrollbars=yes, toolbar=no, menubar=no, location=no, directories=no, status=no, location=no');
    }

    function groupTip(d){
      return nameByIndex.get(d.index) + "<br/>"
             + "Sent " + imports.names[d.index].sent + " out of " + total + " emails" + "<br />"
             + "Received " + imports.names[d.index].received + " emails";
    }

    function chordTip(d){
      //Return the count of emails sent to one receipient out of a list of addresses
      var email = '';
      if(matrix[d.source.index][d.target.index] > 1){
        email = 'emails'
      } else {
        email = 'email';
      }
      return nameByIndex.get(d.source.index) + "<br/>" 
      + "Sent " + matrix[d.source.index][d.target.index] + " " + email + " to " + nameByIndex.get(d.target.index) ;
    }
  });

  d3.select(self.frameElement).style("height", outerRadius * 2 + "px");
}
