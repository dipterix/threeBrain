function get_element_size(el){
  const width = parseFloat(getComputedStyle(el, null).getPropertyValue('width').replace('px', ''));
  const height = parseFloat(getComputedStyle(el, null).getPropertyValue('height').replace('px', ''));
  return([width, height]);
}

export { get_element_size };
