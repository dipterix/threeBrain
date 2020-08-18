# generate freesurfer color LUT
file <- '/Applications/freesurfer/FreeSurferColorLUT.txt'
s <- readLines(file)
s <- s[!stringr::str_detect(s, '^[ ]{0,}#')]
s <- stringr::str_trim(s)
s <- s[s!='']
tbl <- data.table::fread(paste(s, collapse = '\n'))
names(tbl) <- c('ColorID', 'Label', 'R', 'G', 'B', 'A')

tbl <- tbl[,c('ColorID', 'Label', 'R', 'G', 'B')]

ss <- jsonlite::toJSON(tbl, dataframe = 'rows')
ss <- jsonlite::fromJSON(ss, simplifyDataFrame = FALSE)
names(ss) <- tbl$ColorID
# ss <- jsonlite::toJSON(ss, auto_unbox = TRUE)

jsonlite::write_json(structure(list(ss, max(tbl$ColorID)),
                               names = c(
                                 '__global_data__FreeSurferColorLUT',
                                 '__global_data__FreeSurferColorLUTMaxColorID'
                               )),
                     'inst/FreeSurferColorLUT.json', auto_unbox = TRUE)
