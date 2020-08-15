# Main algorithm - rave_executes

require(threeBrain)

# Initialize inputs
dev_threeBrain(expose_functions = TRUE)

mount_demo_subject()

init_module('rave_threebrain_viewer', debug = TRUE)

# >>>>>>>>>>>> Start ------------- [DO NOT EDIT THIS LINE] ---------------------
######' @auto=TRUE

# Get subject, check if it's cached or not


local_data$refresh = Sys.time()

# <<<<<<<<<<<< End ----------------- [DO NOT EDIT THIS LINE] -------------------

# Debug

threeBrain::dev_threeBrain(expose_functions = TRUE)

# Debug - offline:
main = threeBrain:::debug_module('rave_threebrain_viewer')
ret = main()
result = ret$results

result$get_value('preload_info')

m = to_module('rave_threebrain_viewer')
rave::init_app(m, test.mode = T)

# Debug - online:
threeBrain::dev_threeBrain(expose_functions = TRUE)
mount_demo_subject()
view_layout('rave_threebrain_viewer')

# Production - Deploy as RAVE module
# Always Ctrl/cmd+shift+B first if you want to deploy it online
rm(list = ls(all.names = TRUE)); rstudioapi::restartSession()
module = rave::get_module(package = 'threeBrain', module_id = 'rave_threebrain_viewer')
rave::init_app(module)
