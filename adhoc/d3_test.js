// !preview r2d3 data=data.frame(x=1:10, y = 1:10)
//
// r2d3: https://rstudio.github.io/r2d3
//


margin = ({top: 20, right: 30, bottom: 30, left: 40})

x = d3.scaleLinear()
    .domain(d3.extent(data, d => d.x))
    .range([margin.left, width - margin.right])

y = d3.scaleLinear()
    .domain(d3.extent(data, d => d.x)).nice()
    .range([height - margin.bottom, margin.top])

xAxis = g => g
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x).ticks(width / 80).tickSizeOuter(0))

yAxis = g => g
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y))
    .call(g => g.select(".domain").remove())
    .call(g => g.select(".tick:last-of-type text").clone()
        .attr("x", 3)
        .attr("text-anchor", "start")
        .attr("font-weight", "bold")
        .text(data.y))

line = d3.line()
    .defined(d => !isNaN(d.y))
    .x(d => x(d.x))
    .y(d => y(d.y))


// const svg = d3.select(DOM.svg(width, height));

  svg.append("g")
      .call(xAxis);

  svg.append("g")
      .call(yAxis);

  svg.append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", "steelblue")
      .attr("stroke-width", 1.5)
      .attr("stroke-linejoin", "round")
      .attr("stroke-linecap", "round")
      .attr("d", line);

  return svg.node();
