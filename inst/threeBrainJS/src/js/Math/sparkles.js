// !preview r2d3 data=list(id = "canvas", width = "100%", height = "100%", layout = list( list(name = "plot1", x = 0, y = 0, w = "width - 70", h = "height",  xlim = c(1, 10), ylim = c(0.0805062756408006, 0.759302743244916 ), zlim = c(1L, 4L), margin = c(50, 60, 80, 50)), list( name = "plot2", x = "width - 70", y = 0, w = 70, h = "height",  xlim = c(1, 10), ylim = c(0, 1), margin = c(50, 0, 80,  50))), plot_data = list(x = 1, y = c(0.0805062756408006, 0.385681423824281, 0.684253938030452, 0.759302743244916), z = structure(1:4, .Dim = c(1L, 4L))), content = list(plot1 = list(main = "Title", data = NULL,  geom_traces = list(heatmap = list(type = "geom_heatmap",  data = NULL, x = "x", y = "y", z = "z", x_scale = "linear",  y_scale = "linear")), axis = list(list(side = 1, text = "Label X",  at = NULL, labels = NULL, las = 1, cex_axis = 1.3, cex_lab = 1.6,  line = 1.6), list(side = 2, text = "Label Y", at = NULL,  labels = NULL, las = 2, cex_axis = 1, cex_lab = 1.2,  line = 0))), plot2 = list(main = "Legend", data = NULL,  geom_traces = list(lines = list(type = "geom_line", data = NULL,  x = "x", y = "y")), axis = list(list(side = 4, text = "",  at = c(-1, 0, 1), las = 1, cex_axis = 1.3, cex_lab = 1.6,  line = 1.6)))))
//

import * as d3 from "d3";


// 0. util functions
const to_dict = function(x, keys){
  if(typeof(x) !== 'object'){
    x = [x];
  }
  if(x === null){
    return({});
  }
  x = {...x};
  if(keys !== undefined){
    old_keys = Object.keys(x);
    let y = {};

    [...old_keys.keys()].forEach((ii) => {y[keys[ii]] = x[old_keys[ii]]});

    x = y;
  }

  return(x);
};

const to_array = function(x){
  if(typeof(x) !== 'object'){
    x = [x];
  }else{
    if(x === null){
      return([]);
    }
    if(!Array.isArray(x)){
      x = Object.values(x);
    }
  }
  return(x);
}

const sort_keys = function(x){
  return(Array.from(x.keys()).sort((a, b) => x[a] < x[b] ? -1 : (x[b] < x[a]) | 0))
}

function bind_arrays(arrs){
  // arrs must be a dictionary
  arrs = to_dict(arrs);

  // get max length
  let max_len = 0;
  for(let key in arrs){
    arrs[key] = to_array(arrs[key]);
    if( arrs[key].length > max_len ){
      max_len = arrs[key].length
    }
  }

  // combine
  let res = []

  for(let ii = 0; ii < max_len; ii++){
    let row = {};

    for(let key in arrs){
      row[key] = arrs[key][ii % arrs[key].length];
    }

    res.push( row );
  }

  return(res);

}




// 4. render functions
class D3Renderers {
  constructor(id, canvas, width, height, margin){
    this.id = id;
    this.canvas = canvas;
    //this.xlim = xlim;
    //this.ylim = ylim;
    this._width = width;
    this._height = height;

    // mar: use R convention (D, L, U, R)
    this.trans_xy = [margin[1], margin[2]];
    this._minus_y = margin[0] + margin[2];
    this._minus_x = margin[1] + margin[3];
    this.margin = margin;

    // Make sure layers exist
    [
      'layer-lines', 'layer-heatmaps'
    ].forEach((l) => {
      if( ! this.canvas.select('g.' + l).node() ){
        this.canvas.append('g')
          .attr('class', l)
          .attr('transform', `translate(${ this.trans_xy[0] }, ${ this.trans_xy[1] })`);
      }
    });


  }

  get width(){
    return( this._width - this._minus_x );
  }
  get height(){
    return( this._height - this._minus_y );
  }

  add_axis(side, text, at, label, las = 1, cex_axis = 1, cex_lab = 1, line = 1, text_anchor = 'middle'){
    let axis_trace, axis;
    if(side === 1){
      if( ! this.canvas.select('g.axis-bottom').node() ){
        this.canvas.append('g')
          .attr('class', 'axis-bottom')
          .attr('transform', `translate(${ this.trans_xy[0] }, ${ this.trans_xy[1] + this.height })`);
      }
      axis_trace = this.canvas.select('g.axis-bottom');
      axis = d3.axisBottom().scale( this.x_scale );
      this.axis_bottom = axis;
    }else if (side === 2){
      if( ! this.canvas.select('g.axis-left').node() ){
        this.canvas.append('g')
          .attr('class', 'axis-left')
          .attr('transform', `translate(${ this.trans_xy[0] }, ${ this.trans_xy[1] })`);
      }
      axis_trace = this.canvas.select('g.axis-left');
      axis = d3.axisLeft().scale( this.y_scale );
      this.axis_left = axis;
    }else if(side === 3){
      if( ! this.canvas.select('g.axis-top').node() ){
        this.canvas.append('g')
          .attr('class', 'axis-top')
          .attr('transform', `translate(${ this.trans_xy[0] }, ${ this.trans_xy[1] })`);
      }
      axis_trace = this.canvas.select('g.axis-top');
      axis = d3.axisTop().scale( this.x_scale );
      this.axis_top = axis;
    }else if (side === 4){
      if( ! this.canvas.select('g.axis-right').node() ){
        this.canvas.append('g')
          .attr('class', 'axis-right')
          .attr('transform', `translate(${ this.trans_xy[0] + this.width }, ${ this.trans_xy[1] })`);
      }
      axis_trace = this.canvas.select('g.axis-right');
      axis = d3.axisRight().scale( this.y_scale );
      this.axis_right = axis;
    }

    if( at ){
      axis.tickValues( at );
    }
    if( label ){
      axis.tickFormat((d, i) => {
        return(label[i]);
      });
    }

    cex_axis = cex_axis || 1
    cex_lab = cex_lab || 1
    line = line || 1



    let tick_labels = axis_trace
      .style('font-size', `${cex_axis * 100}%`)
      .call( axis )
      .selectAll('text');

    let dx = 0, dy = 0;

    // las from 1-4
    if(side === 1){
      tick_labels.attr("text-anchor", "middle");
      if(las > 1.4 && las < 2.6){
        tick_labels.attr("text-anchor", "end");
        dx = -6
      }else if (las >= 2.6 && las <= 3.4){
        dy = -30
      }else if (las > 3.4 && las < 4.6){
        tick_labels.attr("text-anchor", "start");
        dx = 6
      }
    }
    if(side === 2){
      tick_labels.attr("text-anchor", "end");
      if(las > 1.6 && las < 2.4){
        tick_labels.attr("text-anchor", "middle");
        dx = 9; dy = -18
      }else if (las >= 2.4 && las <= 3.6){
        tick_labels.attr("text-anchor", "start");
        dx = 20
      }else if (las > 3.6 && las < 4.4){
        tick_labels.attr("text-anchor", "middle");
        dx = 9; dy = 18
      }
    }
    if(side === 3){
      tick_labels.attr("text-anchor", "middle");
      if(las > 1.4 && las < 2.6){
        tick_labels.attr("text-anchor", "start");
        dx = 6
      }else if (las >= 2.6 && las <= 3.4){
        dy = 30
      }else if (las > 3.4 && las < 4.6){
        tick_labels.attr("text-anchor", "end");
        dx = -6
      }
    }
    if(side === 4){
      tick_labels.attr("text-anchor", "start");
      if(las > 1.6 && las < 2.4){
        tick_labels.attr("text-anchor", "middle");
        dx = -9; dy = 18
      }else if (las >= 2.4 && las <= 3.6){
        tick_labels.attr("text-anchor", "end");
        dx = -20
      }else if (las > 3.6 && las < 4.4){
        tick_labels.attr("text-anchor", "middle");
        dx = -9; dy = -18
      }
    }

    tick_labels.attr("transform", `rotate(-${90 * (las - 1)}), translate(${dx}, ${dy})`);


    /*
    if( las === 2 ){
      axis_trace
        .selectAll('text')
        .attr('y', '-16')
        .attr('x', '0')
    }
    */

    let lab_trace = axis_trace.selectAll('g.axis-label');

    if( !lab_trace.node() ){
      lab_trace = axis_trace
        .append('g')
        .attr('class', 'axis-label')
        .attr("text-anchor", "middle")
        .attr("fill", 'black');
      lab_trace.append('text');
    }
    let text_trace = lab_trace.select('text');

    if(side == 1){
      lab_trace.attr('transform', `translate(${ this.width/2 }, ${ 35 + line * 6 })`);
    }
    if(side == 2){
      lab_trace.attr('transform', `translate(${ -35 - line * 6 }, ${ this.height / 2 })`);
      text_trace.attr('transform', 'rotate(-90)');
    }
    if(side == 3){
      lab_trace.attr('transform', `translate(${ this.width/2 }, ${ -25 - line * 6 })`);
    }
    if(side == 4){
      lab_trace.attr('transform', `translate(${ 35 + line * 6 }, ${ this.height / 2 })`);
      text_trace.attr('transform', 'rotate(90)');
    }


    text_trace
      .style("text-anchor", text_anchor)
      .style('font-size', `${cex_lab / cex_axis * 100}%`)
      .html(text);

  }

  add_title(text = '', cex_main = 1, text_anchor = 'middle', top = undefined){
    let title_trace = this.canvas.select('g.title');

    if( ! title_trace.node() ){
      title_trace = this.canvas.append('g')
        .attr('class', 'title');

      title_trace.append('text');
    }

    if(top === undefined){
      top = d3.max([this.margin[2] - 50, 0]);
    }

    title_trace
      .attr('transform', `translate(${ this.trans_xy[0] + this.width / 2 }, ${ top })`)
      .select('text')
      .style("text-anchor", text_anchor)
      .style('font-size', `${ cex_main * 200 }%`)
      .html(text)


  }

  get_trace(type, name, tag){
    const layer = this.canvas.select('g.' + type),
          trace = layer.select(`${tag}[layer-name="${name}"]`);

    if( !trace || !trace.node() ){
      layer.append(tag).attr('layer-name', name);
    }

    return( layer.select(`[layer-name="${name}"]`) );
  }

  geom_line(name, get_data = (v) => {return(null)}, trace, layout, axis){
    const xname = trace.x, yname = trace.y;

    this.xlim = layout.xlim;
    this.ylim = layout.ylim;
    // generate scale
    this.x_scale = d3.scaleLinear()
      .domain(this.xlim)
      .range([0, this.width]);

    this.y_scale = d3.scaleLinear()
      .domain(this.ylim)
      .range([this.height, 0]);

    let dat = {};
    dat[xname] = get_data(xname);
    dat[yname] = get_data(yname);
    dat = bind_arrays( dat );


    // get DOM element to draw
    const _trace = this.get_trace( 'layer-lines', name, 'path' );



    // draw line
    let lineGenerator = d3.line();
    lineGenerator
      .x((d) => { return this.x_scale(d[xname]) })
      .y((d) => { return this.y_scale(d[yname]) })
      .defined((d) => {
        return d[xname] !== null && d[yname] !== null;
      });

    let pathString = lineGenerator(dat);

    _trace
      .attr('fill', 'none')
      .attr('stroke', 'black')
      .attr('stroke-width', 2)
      .attr('d', pathString);

  }

  geom_heatmap(name, get_data, trace, layout, axis){
    let x = to_array( get_data(trace.x) ),
        y = to_array( get_data(trace.y) ),
        z = get_data(trace.z),
        x_scale = trace.x_scale || 'linear',
        y_scale = trace.y_scale || 'linear';
    let x_len = x.length,
        y_len = y.length;

    this.cols = trace.palette || ["#FF0000", "#FFDB00", "#49FF00", "#00FF92", "#0092FF", "#4900FF" ,"#FF00DB"];
    this.xlim = [layout.xlim[0], layout.xlim[1]];
    this.ylim = [layout.ylim[0], layout.ylim[1]];
    this.zlim = [layout.zlim[0], layout.zlim[1]];

    if( x_len === 1 ){
      this.xlim[0] = layout.xlim[0] - 0.5;
      this.xlim[1] = layout.xlim[1] + 0.5;
    }else{
      this.xlim[0] = layout.xlim[0] - 0.5 * (x[1] - x[0]);
      this.xlim[1] = layout.xlim[1] + 0.5 * (x[x_len - 1] - x[x_len - 2]);
    }

    if( y_len === 1 ){
      this.ylim[0] = layout.ylim[0] - 0.5;
      this.ylim[1] = layout.ylim[1] + 0.5;
    }else{
      this.ylim[0] = layout.ylim[0] - 0.5 * (y[1] - y[0]);
      this.ylim[1] = layout.ylim[1] + 0.5 * (y[y_len - 1] - y[y_len - 2]);
    }

    /*
    // calculate real x, ylim
    switch (x_scale) {
      case 'log':
        let f = (v) => { return( v===0? 0: Math.log(v) ) };
        x = x.map(f);
        this.xlim = this.xlim.map(f);
        break;
    }
    switch (y_scale) {
      case 'log':
        let f = (v) => { return( v===0? 0: Math.log(v) ) };
        y = y.map(f);
        this.ylim = this.ylim.map(f);
        break;
    }
    */

    const _trace = this.get_trace( 'layer-heatmaps', name, 'g' );
    if( !_trace.select('foreignObject').node() ){
      _trace.append('foreignObject')
        .attr("x", 0)
        .attr("y", 0)
        .append("xhtml:body")
          .style("margin", "0px")
          .style("padding", "0px")
          .style("background-color", "none")
          .style("border", "none")
          .append("img")
            .attr("x", 0)
            .attr("y", 0);
    }
    let inner_canvas = document.createElement('canvas');
    _trace.select('foreignObject')
      .attr("width", this.width)
      .attr("height", this.height)
      .select("body")
        .style('width', this.width + 'px')
        .style('height', this.height + 'px')
        .select('img')
          .attr("width", this.width)
          .attr("height", this.height);

    inner_canvas.setAttribute('width', this.width);
    inner_canvas.setAttribute('height', this.height);

    let ctx = inner_canvas.getContext("2d");

    ctx.clearRect(0, 0, this.width, this.height);

    // draw identifier
    ctx.globalAlpha = 1;

    this.x_scale = d3.scaleLinear()
      .domain( this.xlim );

    const thickness = 2;

    if(trace.rev_x){
      this.x_scale.range( [this.width, 0] );
    }else{
      this.x_scale.range( [0, this.width] );
    }


    this.y_scale = d3.scaleLinear()
      .domain( this.ylim );

    if(trace.rev_y){
      this.y_scale.range( [ this.height, 0 ] );
    }else{
      this.y_scale.range( [ 0, this.height ] );
    }

    this.palette = d3.scaleLinear()
      .domain(
        this.cols.map((d, i) => {
          return ((this.zlim[1] - this.zlim[0]) * i / (this.cols.length - 1) + this.zlim[0])
        })
      )
      .range( this.cols );

    // generate data
    let dat = []

    for(let ix = 0; ix < x_len; ix++ ){
      for(let iy = 0; iy < y_len; iy++ ){
        let rx = x[ix], ry = y[iy], rz = z[ix][iy];

        let last_x = (ix > 0) ? x[ix-1] : rx,
            next_x = (ix < x_len-1) ? x[ix+1] : rx,
            last_y = (iy > 0) ? y[iy-1] : ry,
            next_y = (iy < y_len-1) ? y[iy+1] : ry;

        let rw = (this.x_scale(next_x) - this.x_scale(last_x)) / 2,
            left = (rx - last_x) / 2;

        if( ix === 0 || ix === x_len - 1 ){
          if( x_len === 1 ){
            rw = this.x_scale(0.5 + rx) - this.x_scale(-0.5 + rx);
            left = 0.5;
          }else{
            rw = this.x_scale(next_x) - this.x_scale(last_x) ;
            left = (next_x - last_x) / 2
          }
        }

        let rh = (this.y_scale(next_y) - this.y_scale(last_y)) / 2,
            up = (ry - last_y) / 2;

        if( iy === 0 || iy === y_len - 1 ){
          if( y_len === 1 ){
            rh = this.y_scale(0.5 + ry) - this.y_scale(-0.5 + ry);
            up = 0.5
          }else{
            rh = this.y_scale(next_y) - this.y_scale(last_y) ;
            up = (next_y - last_y) / 2;
          }
        }

        let d = {
          'x' : this.x_scale( rx - left ),
          'y' : this.y_scale( ry - up ),
          'w' : rw,
          'h' : rh,
          'z' : rz
        };

        // draw the data
        ctx.fillStyle = this.palette(d.z);
        ctx.fillRect(d.x - thickness/2, d.y - thickness/2, Math.abs(d.w) + thickness, Math.abs(d.h) + thickness);

        dat.push(d);

      }
    }

    // window.dd=dat


    _trace.select('img').attr('src', inner_canvas.toDataURL());

  }
}



class D3Canvas {
  constructor(data, parent_el = document.body) {
    this.data = data;
    this.parent_el = parent_el;
    this.canvas = {};
    this._initialized = false;
  }

  initialize(){
    // Generate SVG node
    this.init_canvas();

    // generate layout
    this.layout();

    this._initialized = true;

  }

  // layout
  layout(){
    this.data.layout.forEach((l) => {
      let width = this.svg.property('clientWidth');
      let height = this.svg.property('clientHeight');
      let x = Number.isNaN(+ l.x) ? eval( l.x ) : l.x;
      let y = Number.isNaN(+ l.y) ? eval( l.y ) : l.y;
      let w = Number.isNaN(+ l.w) ? eval( l.w ) : l.w;
      let h = Number.isNaN(+ l.h) ? eval( l.h ) : l.h;
      let s = `g[grid-name="${ l.name }"]`;
      if( !this.svg.select(s).node() ){
        this.svg.append('g').attr('grid-name', l.name);
      }
      let obj = this.svg.select(s)
        .attr('transform', `translate(${x}, ${y})`)
        .attr('width', w)
        .attr('height', h);

      // name, canvas, width, height, xlim, ylim, margin
      this.canvas[ l.name ] = {
        'object' : new D3Renderers(l.name, obj, w, h, l.margin),
        'layout' : l
      };

    });
  }

  // generate canvas and clear elements (optional)
  init_canvas(clear = true){
    if( typeof(svg) !== 'undefined' ){
      this.svg = svg;
    }else if( this.data.id ){
      let el = d3.select('#' + this.data.id);
      if( el.node() ){
        if( el.property('tagName').toUpperCase() !== 'SVG' ){
          if( el.select('svg').node() ){
            el = el.select('svg');
          }else{
            el = el.append('svg');
          }
        }
        this.svg = el;
      }
    }
    if( !this.svg ){
      // use body as parent
      this.svg = d3.select(this.parent_el).append('svg');
    }

    // Clear components
    if(clear){
      this.svg.html('');
    }

    // set dimension to be compatible with r2d3
    const w = this.data.width || (typeof(width) === 'undefined' ? '100vw' : width + 'px');
    const h = this.data.height || (typeof(height) === 'undefined' ? '100vh' : height + 'px');

    this.svg
      .attr('width', w)
      .attr('height', h);

  }

  get_data(var_name, graph_name = '.', trace_name = '.'){
    // 1. check layer data first
    let re = null;
    try {
      re = this.data.content[ graph_name ].geom_traces[ trace_name ].data[ var_name ];
    } catch (e) {
      re = undefined
    }

    if( re ){
      return( re )
    }

    try {
      re = this.data.content[ graph_name ].data[ var_name ];
    } catch (e) {
      re = undefined
    }

    if( re ){
      return( re )
    }

    try {
      re = this.data.plot_data[ var_name ];
    } catch (e) {
      re = null
    }

    return( re );


  }


  _render_graph(graph_name, title = undefined){

    if( ! this._initialized ){
      this.initialize();
    }

    let layer_data = this.data.content[ graph_name ];
    let sub_graph = this.canvas[ graph_name ],
        sub_canvas = sub_graph.object,
        sub_layout = sub_graph.layout;


    if( !sub_canvas ){
      return(null);
    }

    for(let trace_name in layer_data.geom_traces ){
      let trace = layer_data.geom_traces[trace_name];
      let type = trace.type;
      let dat = this.get_data(graph_name, trace_name);

      if(typeof(sub_canvas[type]) === 'function'){
        sub_canvas[type](trace_name, (variable) => {
          return(
            this.get_data(variable, graph_name, trace_name)
          );
        }, trace, sub_layout, to_array(layer_data.axis));
      }
    }

    // axis
    if( Array.isArray(layer_data.axis) ){
      layer_data.axis.forEach((v) => {
        sub_canvas.add_axis(v.side, v.text, v.at, v.labels, v.las, v.cex_axis, v.cex_lab, v.line);
      });
    }

    // title
    sub_canvas.add_title(title || layer_data.main, layer_data.cex_main || 1, layer_data.anchor_main || 'middle', layer_data.main_top );


  }

  render(){

    for(let graph_name in this.data.content){
      this._render_graph( graph_name );
    }

  }
}


export { D3Canvas };



// window.canvas = new D3Canvas(data).full_render();
