import { CONSTANTS } from '../constants.js';
import { has_meta_keys } from '../utils.js';

// 11. surface type
// 12. Hemisphere material/transparency
// surface color

function registerPresetSurface( ViewerControlCenter ){


  ViewerControlCenter.prototype.get_surface_ctype = function(){
    const _c = this.gui.get_controller( 'Surface Color' );
    if( _c.isfake ){ return( "none" ); }
    return( _c.getValue() );
  };

  ViewerControlCenter.prototype.addPreset_surface_type2 = function(){

    const folderName = CONSTANTS.FOLDERS[ 'surface-selector' ],
          initialSurfaceType = this.canvas.get_state( 'surface_type' ) || 'pial',
          surfaceTypeChoices = this.canvas.getAllSurfaceTypes(),
          initialMaterialType = this.canvas.get_state( 'surface_material_type' ) || 'MeshPhongMaterial',
          materialChoices = ['MeshPhongMaterial', 'MeshLambertMaterial'];

    if( !Array.isArray( surfaceTypeChoices ) || surfaceTypeChoices.length === 0 ){ return; }

    const controllerSurfaceType = this.gui
      .addController( 'Surface Type' , "" ,
                      {args : surfaceTypeChoices, folderName : folderName })
      .onChange((v) => {
        this.canvas.switch_subject( '/', { 'surface_type': v });
        this.fire_change({ 'surface_type' : v });
      });
    controllerSurfaceType.setValue( initialSurfaceType );
    this.gui.addTooltip( CONSTANTS.TOOLTIPS.KEY_CYCLE_SURFACE, 'Surface Type', folderName );

    this.canvas.add_keyboard_callabck( CONSTANTS.KEY_CYCLE_SURFACE, (evt) => {
      if( has_meta_keys( evt.event, false, false, false ) ){
        const selectedType = controllerSurfaceType.getValue();
        let selectedIndex = ( surfaceTypeChoices.indexOf( selectedType ) + 1 );
        selectedIndex = selectedIndex % surfaceTypeChoices.length;
        if( selectedIndex >= 0 ){
          controllerSurfaceType.setValue( surfaceTypeChoices[ selectedIndex ] );
        }
      }
    }, 'gui_surf_type2');

    const controllerSurfaceMaterial = this.gui
      .addController('Surface Material', "", {
                      args : materialChoices, folderName : folderName })
      .onChange((v) => {
        this.canvas.set_state( 'surface_material_type', v );
        this.fire_change({ 'surface_material' : v });
        this._update_canvas();
      });
    controllerSurfaceMaterial.setValue( initialMaterialType );
    this.gui.addTooltip( CONSTANTS.TOOLTIPS.KEY_CYCLE_MATERIAL, 'Surface Material', folderName );

    this.canvas.add_keyboard_callabck( CONSTANTS.KEY_CYCLE_MATERIAL, (evt) => {
      if( has_meta_keys( evt.event, true, false, false ) ){
        const selectedType = controllerSurfaceMaterial.getValue();
        let selectedIndex = ( materialChoices.indexOf( selectedType ) + 1 );
        selectedIndex = selectedIndex % materialChoices.length;
        if( selectedIndex >= 0 ){
          controllerSurfaceMaterial.setValue( materialChoices[ selectedIndex ] );
        }
      }
    }, 'gui_surf_material');


  };

  // should call hemisphere type... but anyway
  ViewerControlCenter.prototype.addPreset_hemisphere_material = function(){

    const folderName = CONSTANTS.FOLDERS[ 'hemisphere-material' ],
          options = ['normal', 'wireframe', 'hidden'];

    const ctrlLHStyle = this.gui
      .addController('Left Hemisphere', 'normal', { args : options , folderName : folderName })
      .onChange((v) => {
        this.canvas.switch_subject( '/', { 'material_type_left': v });
        this.fire_change();
      });
    this.gui.addTooltip( CONSTANTS.TOOLTIPS.KEY_CYCLE_LEFT, 'Left Hemisphere', folderName );

    const ctrlRHStyle = this.gui
      .addController('Right Hemisphere', 'normal', { args : options, folderName : folderName })
      .onChange((v) => {
        this.canvas.switch_subject( '/', { 'material_type_right': v });
        this.fire_change();
      });
    this.gui.addTooltip( CONSTANTS.TOOLTIPS.KEY_CYCLE_RIGHT, 'Right Hemisphere', folderName );

    const ctrlLHOpacity = this.gui
      .addController('Left Opacity', 1.0, { folderName : folderName })
      .min( 0.1 ).max( 1 ).decimals( 1 )
      .onChange((v) => {
        this.canvas.switch_subject( '/', { 'surface_opacity_left': v });
        this.fire_change();
      });
    this.gui.addTooltip( '⇧' + CONSTANTS.TOOLTIPS.KEY_CYCLE_LEFT, 'Left Opacity', folderName );

    const ctrlRHOpacity = this.gui
      .addController('Right Opacity', 1.0, { folderName : folderName })
      .min( 0.1 ).max( 1 ).decimals( 1 )
      .onChange((v) => {
        this.canvas.switch_subject( '/', { 'surface_opacity_right': v });
        this.fire_change();
      });
    this.gui.addTooltip( '⇧' + CONSTANTS.TOOLTIPS.KEY_CYCLE_RIGHT, 'Right Opacity', folderName );

    // add keyboard shortcut
    this.canvas.add_keyboard_callabck( CONSTANTS.KEY_CYCLE_LEFT, (evt) => {
      if( has_meta_keys( evt.event, true, false, false ) ){
        let opacity = ctrlLHOpacity.getValue() - 0.3;
        if( opacity < 0 ){ opacity = 1; }
        ctrlLHOpacity.setValue( opacity );
      }else if( has_meta_keys( evt.event, false, false, false ) ){
        let styleIndex = (options.indexOf( ctrlLHStyle.getValue() ) + 1) % options.length;
        if( styleIndex >= 0 ){
          ctrlLHStyle.setValue( options[ styleIndex ] );
        }
      }
    }, 'gui_left_cycle');

    this.canvas.add_keyboard_callabck( CONSTANTS.KEY_CYCLE_RIGHT, (evt) => {
      if( has_meta_keys( evt.event, true, false, false ) ){
        let opacity = ctrlRHOpacity.getValue() - 0.3;
        if( opacity < 0 ){ opacity = 1; }
        ctrlRHOpacity.setValue( opacity );
      }else if( has_meta_keys( evt.event, false, false, false ) ){
        let styleIndex = (options.indexOf( ctrlRHStyle.getValue() ) + 1) % options.length;
        if( styleIndex >= 0 ){
          ctrlRHStyle.setValue( options[ styleIndex ] );
        }
      }
    }, 'gui_right_cycle');
  };

  ViewerControlCenter.prototype.addPreset_surface_color = function(){
    const folderName = CONSTANTS.FOLDERS[ 'surface-selector' ],
          maps = {
            'vertices' : CONSTANTS.VERTEX_COLOR,
            'sync from voxels' : CONSTANTS.VOXEL_COLOR,
            'sync from electrodes' : CONSTANTS.ELECTRODE_COLOR,
            'none' : CONSTANTS.DEFAULT_COLOR
          },
          options = Object.keys( maps );

    const ctrlSurfaceColorType = this.gui
      .addController('Surface Color', "vertices", {args : options, folderName : folderName })
      .onChange((v) => {

        switch (v) {
          case "sync from voxels":
            this.gui.showControllers(['Sigma', 'Blend Factor'], folderName );
            this.gui.hideControllers(['Decay', 'Range Limit'], folderName );
            break;

          case "sync from electrodes":
            this.gui.showControllers(['Decay', 'Range Limit', 'Blend Factor'], folderName );
            this.gui.hideControllers(['Sigma'], folderName );
            break;

          case "vertices":
            this.gui.showControllers(['Blend Factor'], folderName );
            this.gui.hideControllers(['Sigma', 'Decay', 'Range Limit'], folderName );
            break;

          default:
            // none
            v = "none";
            this.gui.hideControllers(['Blend Factor', 'Sigma', 'Decay', 'Range Limit'], folderName );
        }

        this.canvas.set_state( "surface_color_type", v);
        this.fire_change({ 'surface_color_type' : v });
        this._update_canvas();
      })
      .setValue( this.canvas.get_state("surface_color_type", 'vertices') );


    this.canvas.add_keyboard_callabck( CONSTANTS.KEY_CYCLE_SURFACE_COLOR, (evt) => {
      if( has_meta_keys( evt.event, false, false, false ) ){
        // options
        let selectedIndex = (options.indexOf( ctrlSurfaceColorType.getValue() ) + 1) % options.length;
        if( selectedIndex >= 0 ){
          ctrlSurfaceColorType.setValue( options[ selectedIndex ] );
        }
      }
    }, 'gui_surf_color_type');
    this.gui.addTooltip( CONSTANTS.TOOLTIPS.KEY_CYCLE_SURFACE_COLOR, 'Surface Color', folderName );

    this.gui
      .addController( "Blend Factor", 0.0, { folderName : folderName } )
      .min( 0 ).max( 1 ).decimals( 2 )
      .onChange((v) => {
        if( typeof(v) != "number" ){
          v = 0.4;
        } else if( v < 0 ){
          v = 0;
        } else if (v > 1){
          v = 1;
        }
        // this.set_surface_ctype( true, { 'blend' : v } );
        this.canvas.set_state("surface_color_blend", v);
        this._update_canvas();
      }).setValue( 0.4 );

    // ---------- for voxel-color ---------------

    const map_delta = this.gui
      .addController("Sigma", 2, { folderName : folderName }).min( 0 ).max( 10 )
      .onChange((v) => {
        if( v !== undefined ){
          if( v < 0 ){ v = 0; }
          // this.set_surface_ctype( true, { 'sigma' : v } );
          this.canvas.set_state("surface_color_sigma", v);
          this._update_canvas();
        }
      }).setValue( 3 );

    // ---------- for electrode maps ------------
    this.gui.addController("Decay", 0.1, { folderName : folderName })
      .min( 0.05 ).max( 1 ).step( 0.05 ).decimals( 2 )
      .onChange((v) => {
        if( v !== undefined ){
          if( v < 0.05 ){ v = 0.05; }
          // this.set_surface_ctype( true, { 'decay' : v } );
          this.canvas.set_state("surface_color_decay", v);
          this._update_canvas();
        }
      }).setValue( 1.5 );

    this.gui.addController("Range Limit", 0.0, { folderName : folderName })
      .min( 1.0 ).max( 30.0 ).step( 1.0 ).decimals( 1 )
      .onChange((v) => {
        if( v !== undefined ){
          if( v < 1.0 ){ v = 1.0; }
          // this.set_surface_ctype( true, { 'radius' : v } );
          this.canvas.set_state("surface_color_radius", v);
          this._update_canvas();
        }
      }).setValue( 1.0 );

    // 'elec_decay'        : { value : 2.0 },
    // 'blend_factor'      : { value : 0.4 }


    this.gui.hideControllers(['Blend Factor', 'Sigma', 'Decay', 'Range Limit'], folderName);
  };

  return( ViewerControlCenter );

}

export { registerPresetSurface };
