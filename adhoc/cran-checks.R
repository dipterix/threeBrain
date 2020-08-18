spelling::spell_check_package()
ac = goodpractice::all_checks()
goodpractice::gp(checks = ac[-c(1:2)])
tools::dependsOnPkgs(pkgs = 'threeBrain')
utils::globalVariables(package = 'threeBrain')
spelling::spell_check_package()
devtools::check_win_release()
devtools::check_win_devel()
usethis::use_travis()

devtools::check_rhub()

devtools::spell_check()
devtools::release(check = TRUE)
