# File defining module inputs, outputs

# ----------------------------------- Debug ------------------------------------
require(threeBrain)

env = dev_threeBrain(T)

#' Load subject for debugging
#' Make sure this is executed before developing the module to make sure
#' at least one subject is loaded
mount_demo_subject()


# >>>>>>>>>>>> Start ------------- [DO NOT EDIT THIS LINE] ---------------------


load_scripts(
  get_path('inst/modules/rave_threebrain_viewer/three_viewer.R'),

  # Do not move to template folder as there is no need to
  asis = TRUE
)

#  ----------------------  Initializing Global variables -----------------------


define_initialization({
})



#  ---------------------------------  Inputs -----------------------------------

# No input as we want to maximize our viewer

# End of input
# ----------------------------------  Outputs ----------------------------------

define_output(
  definition = customizedUI('three_viewer_ui'),
  title = '3D Viewer',
  width = 12,
  order = 1
)

# <<<<<<<<<<<< End ----------------- [DO NOT EDIT THIS LINE] -------------------

# -------------------------------- View layout ---------------------------------

# Preview
require(rave)
view_layout('rave_threebrain_viewer')
