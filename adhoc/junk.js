

// 1. get width and height
function get_size(data){
  // to be compatible with r2d3
  let w = data.width || typeof(width) === 'undefined' ? '100vw' : width + 'px';
  let h = data.height || typeof(height) === 'undefined' ? '100vh' : height + 'px';

  return({
    'width' : w,
    'height' : h
  });
}

// 2 get selector
function get_svg(data){

  has_svg = typeof(svg) !== 'undefined';
  const mar = data.margin.map((v) => {
    return(v + 'px');
  }).join(' ');
  css = `margin: 0; ${ data.css_style || '' }`;

  if( has_svg ){
    return( svg.attr('style', css ) );
  }

  if ( data.id ){
    // id is given, override r2d3 svg
    let el = document.getElementById(data.id);
    if ( el ){
      let canvas_size = get_size(data);

      return(
        d3.select(el)
          .attr('width', canvas_size.width)
          .attr('height', canvas_size.height)
          .attr('style',  css)
      );
    }
  }

  // standalone, append to body!
  return(
    d3.select('body').append('svg')
      .attr('width', canvas_size.width)
      .attr('height', canvas_size.height)
      .attr('style', css )
  );
}

// 3. get data (TODO: if data is a csv or json file)
function get_data(data, name = '.'){
  // if name is '.', then the top data, otherwise layer data.
  // if geom_layers data is null, then go back to top
  if( data.geom_layers &&
      data.geom_layers.hasOwnProperty(name) &&
      data.geom_layers[name].data
    ){
      return(data.geom_layers[name].data);
    }

  return(data.data);
}

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
  constructor(id, canvas, xlim, ylim, margin){
    this.canvas = canvas;
    this.xlim = xlim;
    this.ylim = ylim;

    // mar: use R convention (D, L, U, R)
    this.trans_xy = [margin[1], margin[2]];
    this._minus_y = margin[0] + margin[2];
    this._minus_x = margin[1] + margin[3];
    this.margin = margin;

    // Make sure layers exist
    [
      'layer-lines'
    ].forEach((l) => {
      if( ! this.canvas.select('g.' + l).node() ){
        this.canvas.append('g')
          .attr('class', l)
          .attr('transform', `translate(${ this.trans_xy[0] }, ${ this.trans_xy[1] })`);
      }
    });


    // generate scale
    this.x_scale = d3.scaleLinear()
      .domain(this.xlim)
      .range([0, this.width]);

    this.y_scale = d3.scaleLinear()
      .domain(this.ylim)
      .range([this.height, 0]);

  }

  get width(){
    return( this.canvas.node().clientWidth - this._minus_x );
  }
  get height(){
    return( this.canvas.node().clientHeight - this._minus_y );
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

  add_title(text = 'asd', cex_main = 1, text_anchor = 'middle', top = undefined){
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
          trace = layer.select('#' + this.id + '--' + name);

    if( !trace || !trace.node() ){
      layer.append(tag).attr('id', this.id + '--' + name);
    }

    return( layer.select('#' + this.id + '--' + name) );
  }

  geom_line(name, data, parent_data, xname = 'x', yname = 'y'){
    let dat = {};
    dat[xname] = data[xname] === undefined ? parent_data[ xname ] : data[xname];
    dat[yname] = data[yname] === undefined ? parent_data[ yname ] : data[yname];
    dat = bind_arrays( dat );
    window.dd = dat

    // get DOM element to draw
    const trace = this.get_trace( 'layer-lines', name, 'path' );

    // draw line
    let lineGenerator = d3.line();
    lineGenerator
      .x((d) => { return this.x_scale(d[xname]) })
      .y((d) => { return this.y_scale(d[yname]) })
      .defined((d) => {
        return d[xname] && d[yname];
      });

    let pathString = lineGenerator(dat);

    trace
      .attr('fill', 'none')
      .attr('stroke', 'black')
      .attr('stroke-width', 5)
      .attr('d', pathString);

  }
}


const canvas_size = get_size(data);
const renderer = new D3Renderers(data.id, get_svg(data), data.xlim, data.ylim, data.margin);

for(let layer_name in data.geom_layers ){
  let layer = data.geom_layers[layer_name];
  let type = layer.type;
  let dat = get_data(data, layer_name);

  if(typeof(renderer[type]) === 'function'){
    renderer[type](layer_name, dat, data, layer.x, layer.y);
  }
}

if( Array.isArray(data.axis) ){
  data.axis.forEach((v) => {
    renderer.add_axis(v.side, v.text, v.at, v.labels, v.las, v.cex_axis, v.cex_lab, v.line);
  })
}

//side, at, label, las, cex_lab = 1, cex_axis = 1
renderer.add_title(data.main);

window.renderer = renderer;
