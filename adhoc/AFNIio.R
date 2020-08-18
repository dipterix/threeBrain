# This file is a modified version of AFNIio.R to read in afni data

#------------------------------------------------------------------
# Functions for library loading
#------------------------------------------------------------------


warn.AFNI <- function (str='Consider yourself warned',
                       callstr=NULL,
                       newline=TRUE) {
   cat2('[AFNI WARN]:', str, '-', callstr, level = 'WARNING', end = ifelse(newline, '\n', ''))
}

err.AFNI <- function (str='Danger Danger Will Robinson',
                      callstr=NULL,
                      newline=TRUE) {
   cat2('[AFNI ERROR]:', str, '-', callstr, level = 'ERROR', end = ifelse(newline, '\n', ''))
}


note.AFNI <- function (str='May I speak frankly?',
                       callstr=NULL, newline=TRUE, ...) {
   cat2('[AFNI NOTE]:', str, '-', callstr, level = 'DEBUG', end = ifelse(newline, '\n', ''))
}




have_R_io <- function() {
   FALSE
}


#------------------------------------------------------------------
# Functions to deal with AFNI file names
#------------------------------------------------------------------



exists.AFNI.name <- function(an) {
   if (is.character(an)) an <- parse.AFNI.name(an);

   ans <- 0
   if (file.exists(head.AFNI.name(an))) ans <- ans + 1;

   if (file.exists(brik.AFNI.name(an)) ||
       file.exists(paste(brik.AFNI.name(an),'.gz', sep='')) ||
       file.exists(paste(brik.AFNI.name(an),'.Z', sep=''))) ans <- ans + 2;
   return(ans);
}


uncompress.AFNI <- function(an, verb = 1) {
   if (is.character(an)) an <- parse.AFNI.name(an);

   ans <- 0

   zz <- paste(brik.AFNI.name(an),'.Z', sep='');
   if (file.exists(zz)) {
      if (verb) {
         cat ('Uncompressing', zz, '\n');
      }
      system(paste('uncompress', zz));
   }

   zz <- paste(brik.AFNI.name(an),'.gz', sep='');
   if (file.exists(zz)) {
      if (verb) {
         cat ('gzip -d-ing', zz, '\n');
      }
      system(paste('gzip -d', zz));
   }

   zz <- paste(brik.AFNI.name(an),'.bz2', sep='');
   if (file.exists(zz)) {
      if (verb) {
         cat ('bzip2 -d-ing', zz, '\n');
      }
      system(paste('bzip2 -d', zz));
   }


   return(an);
}


show.AFNI.name <- function(an) {
   cat ('\n',
        'uname=', an$orig_name, '\n',
        'file=', an$file,'\n',
        'type =', an$type,'\n',
        'pref.=', an$pprefix, '\n',
        'view =', an$view, '\n',
        'head =', head.AFNI.name(an), '\n',
        'brik =', brik.AFNI.name(an), '\n',
        'brsel=', an$brsel, '\n',
        'rosel=', an$rosel, '\n',
        'rasel=', an$rasel, '\n',
        'insel=', an$insel, '\n',
        'compr=', compressed.AFNI.name(an), '\n',
        'exist=', exists.AFNI.name(an), '\n');
}


newid.AFNI <-function(len=26) {
   return(paste("XYZ_",
                paste(sample(c(rep(0:9,each=5),LETTERS, letters),
                             len-4, replace=TRUE), collapse='', sep=''), sep='',collapse=''))
}

sys.AFNI <- function(com=NULL, fout=NULL, ferr=NULL, echo=FALSE,
                     CoS=errex.AFNI ) {
   ss <- list(stat=1, err='', out='')
   if (is.null(com)) return(ss)
   rmfout <- FALSE
   if (is.null(fout)) {
      fout <- sprintf('/tmp/fout.%s', newid.AFNI())
      rmfout <- TRUE
   }
   rmferr <- FALSE
   if (is.null(ferr)) {
      ferr <- sprintf('/tmp/ferr.%s', newid.AFNI())
      rmferr <- TRUE
   }
   if (echo) note.AFNI(paste("Executing shell command",com))
   ss$stat<-try(system(paste(com,' 1>', fout,' 2>', ferr, collapse='')))
   ss$out <- readLines(fout, n=-1, ok=TRUE, warn=FALSE, encoding='unknown')
   if (rmfout) unlink(fout);
   ss$err <- readLines(ferr, n=-1, ok=TRUE, warn=FALSE, encoding='unknown')
   if (rmfout) unlink(ferr);
   if (ss$stat && !is.null(CoS)) CoS(paste("Error status executing:\n",com))
   invisible(ss)
}

who.called.me <- function (quiet_inquisitor=FALSE, trim = 0) {
   mm <- (as.list(sys.calls()))
   #str(mm)
   N_mm <- length(mm)
   callstr <- NULL
   if (quiet_inquisitor) skp <- 2
   else skp <- 1
   callstr <- ''
   for (i in (N_mm-skp):1 ) {
      caller <- as.character(mm[i])
      if (length(caller) == 0) {
         caller <- 'R_prompt'
      }
      if (trim==-1) { #function only
         caller <-  strsplit(caller[1],'(', fixed=TRUE)[[1]][1]
      } else if (trim>0) {
         fun <- strsplit(caller[1],'(', fixed=TRUE)[[1]][1]
         par <- strsplit(caller[1],'(', fixed=TRUE)[[1]][2]
         par <- strsplit(par,'')[[1]]
         n_char <- min(length(par),trim)
         if (n_char < length(par)) ell <- '...'
         else {
            ell <- ''
            #and remove last parentheses
            par <- sub(')$','',par)
         }
         if (is.na(par[1])) {
            caller <-  paste(fun, collapse='', sep='')
         } else {
            caller <-  paste(fun, '(', paste(par[1:n_char],collapse='', sep=''),
                             ell, ')', collapse='', sep='')
         }
      }
      spc = '    '
      if (i == N_mm-skp) {
         callstr <- paste(callstr, caller[1])
      } else {
         spc <- paste(spc, '   ', sep='')
         callstr <-paste(callstr, '\n',spc,  '-->',
                         caller,
                         sep= '')
      }
   }
   return(callstr)
}


#return 1 if all strings in vector ss can be changed to numbers
is.num.string <- function(ss) {
   if (is.null(ss) || !length(ss) || ss == '' ||
       is.null(tryCatch(as.numeric(ss),
                        warning=function(ex) {}))) {
      return(0);
   } else {
      return(1);
   }
}

clean.args.string <- function(ss) {
   if (is.list(ss) || length(ss) > 1) {
      warning(paste('Function only works on single strings',
                    str(ss),'\n', sep=''),
              immediate.=TRUE);
      return(NULL);
   }
   #remove trailing whites
   ss <- sub('^[[:space:]]*','',ss);
   ss <- sub('[[:space:]]*$','',ss);
   #remove multiple whites
   ss <- gsub('[[:space:]]+',' ',ss);
   #treat = nicely
   ss <- gsub('[[:space:]]*=[[:space:]]*','=',ss)
   return(ss)
}

deblank.string <- function(s, start=TRUE, end=TRUE, middle=FALSE) {
   if (end) {
      s = sub('[[:space:]]+$','',s);
   }
   if (start) {
      s = sub('^[[:space:]]+','',s);
   }
   if (middle) {
      s = gsub('[[:space:]]+',' ',s);
   }
   return(s);
}


trim.string <- function (s, nchar=32, left=TRUE, strim='...')
{
   ss <- strsplit(s,'')[[1]]
   if (length(ss)>nchar) {
      #try deblanking
      s <- deblank.string(s)
      ss <- strsplit(s,'')[[1]]
      nc <- length(ss)
      if (nc>nchar) {
         #browser()
         nstrim = length(strsplit(strim,'')[[1]])
         if (left) {
            ns <- nc - nchar - nstrim
            if (ns > nstrim) {
               ss <- ss[ns:nc]
               s<-paste(strim,paste(ss,collapse=''), sep='')
            }
            return(s)
         }else {
            ns <- nchar - nstrim
            ss <- ss[1:ns]
            s<-paste(paste(ss,collapse=''), strim, sep='')
         }
      } else return(s)
   } else return(s)
}

as.num.vec <- function(ss, addcount=TRUE, sepstr='.', reset=FALSE) {
   if (is.list(ss) || length(ss) > 1) {
      warning(paste('Function only works on single strings',
                    str(ss),'\n', sep=''),
              immediate.=TRUE);
      return(NULL);
   }
   ss <- clean.args.string(ss)
   dd <- strsplit(ss,' ')[[1]];
   nn <- vector('numeric');
   ww <- vector('character');
   lastname <- '.v'
   valnum <- 0
   for (ii in 1:length(dd)) {
      vv <- strsplit(dd[ii],'=')[[1]];
      if (length(vv) > 1) {
         valnum <- valnum+1
         ll <- vv[1]
         vv <- as.numeric(vv[length(vv)]);
         if (is.na(vv)) { return(NULL); }
         lastname <- ll
      } else {
         valnum <- valnum+1
         vv <- as.numeric(vv[1]);
         if (is.na(vv)) { return(NULL); }
         if (addcount) {
            sfnd <- paste(lastname, sepstr,'[[:digit:]]*$', sep='', collapse='')
            if (!reset) {
               ifnd <- grep(sfnd,ww);
            } else {
               ifnd <- grep(sfnd,ww[length(ww)]);
               if (length(ifnd)) {
                  ifnd <- length(ww);
               } else {
                  valnum <- 1
               }
            }
            if (length(ifnd)) {
               lastval <- strsplit(ww[ifnd[length(ifnd)]],
                                   paste(lastname, sepstr,sep=''))[[1]];
               if (lastval[length(lastval)] == '') {
                  valnum <- 1
               } else {
                  valnum <- as.numeric(lastval[length(lastval)]) + 1
               }
            }
            ll <- paste(lastname,sepstr, as.numeric(valnum), sep='')
         } else {
            ll <- paste(lastname, sep='')
         }
      }

      nn <- c(nn,vv)
      ww <- c(ww,ll)
   }
   names(nn) <- ww
   return(nn)
}

as.char.vec <- function(ss) {
   if (is.list(ss) || length(ss) > 1) {
      warning(paste('Function only works on single strings',
                    str(ss),'\n', sep=''),
              immediate.=TRUE);
      return(NULL);
   }
   ss <- clean.args.string(ss)
   dd <- strsplit(ss,' ')[[1]];
   nn <- vector('character');
   ww <- vector('character');
   for (ii in 1:length(dd)) {
      vv <- strsplit(dd[ii],'=')[[1]];
      if (length(vv) > 1) ll <- vv[1]
      else ll <- paste('v',as.character(vv[1]), sep='')

      vv <- as.character(vv[length(vv)]);
      if (is.na(vv)) { return(NULL); }

      nn <- c(nn,vv)
      ww <- c(ww,ll)
   }
   names(nn) <- ww
   return(nn)
}

#------------------------------------------------------------------
#   Functions to read 1D and other tables
#------------------------------------------------------------------

is.wholenumber.AFNI <- function(x, tol = .Machine$double.eps^0.5, all=TRUE)  {
   if (is.null(x)) return(FALSE)
   if (!all) {
      return(abs(x - round(x)) < tol)
   } else {
      return(prod(abs(x - round(x)) < tol)==1)
   }
   return(FALSE)
}

r.NI_get_attribute <- function (nel,name, brsel=NULL,
                                colwise=FALSE, is1Dstr=FALSE,
                                sep=' ; ', num=FALSE) {
   ffs <- NULL
   for (i in 1:length(nel$atlist)) {
      if (!is.na(nel$atlist[[i]]$lhs) &&
          nel$atlist[[i]]$lhs == name) {
         ffs <- nel$atlist[[i]]$rhs
         break
      }
   }

   if (is.null(ffs)) return(NULL)

   #ffs <- gsub("[;\"]","", ffs)
   if (colwise) { #a per column deal, process it
      #remove bad chars and split into one for each column
      if (is1Dstr) {
         ffs = expand_1D_string (ffs)
      } else {
         ffsv <- strsplit(ffs,sep)[[1]]
         #some components are blanks to be killed
         ffs <- ffsv[which(nchar(ffsv)!=0)]
      }
      if (!is.null(brsel)) {
         if (max(brsel+1) > length(ffs)) {
            err.AFNI(paste("Have ", length(ffs),
                           "attribute elements in ", paste(ffs,collapse=' '),
                           ".\nBrick selection calls for max. of ",
                           max(brsel+1)," columns\n"
            ));
         }
         ffs <- ffs[brsel+1]
         if (num) return(as.numeric(ffs))
         else return(ffs)
      } else {
         #No selection, return all
         if (num) return(as.numeric(ffs))
         else return(ffs)
      }
   } else {
      if (num) return(as.numeric(ffs))
      else return(ffs)
   }
   return(NULL)
}

r.NI_set_attribute <- function (nel,name, val) {
   ig <- -1

   if (length(nel$atlist)) {
      for (i in 1:length(nel$atlist)) {
         if (!is.na(nel$atlist[[i]]$lhs) &&
             nel$atlist[[i]]$lhs == name) {
            ig<-i
            break
         }
      }
   }
   if (ig > 0) {
      nel$atlist[[ig]] <- list(lhs=deblank.string(name),
                               rhs=r.NI_dequotestring(val, db=TRUE))
   } else {
      nel$atlist <- c (nel$atlist,
                       list(list(lhs=deblank.string(name),
                                 rhs=r.NI_dequotestring(val, db=TRUE))))
   }
   return(nel)
}

r.NI_dequotestring <- function(val, db=FALSE) {
   if (db) val <- deblank.string(val)
   val <- sub('^\"','', val)
   val <- sub('\"$','', val)
   val <- sub("^\'",'', val)
   val <- sub("\'$",'', val)
   return((val))
}

# A very basic parser, works only on simple elements
#of ascii headersharp niml files . Needs lots of work!
r.NI_read_element <- function (fname, HeadOnly = TRUE) {
   fnp <- parse.AFNI.name(fname)

   if (!file.exists(fnp$file)) {
      return(NULL)
   }

   ff <- scan(fnp$file, what = 'character', sep = '\n', quiet=TRUE)

   return(r.NI_read_str_element(ff, HeadOnly))
}

r.NI_read_str_element <- function (ff, HeadOnly = TRUE) {
   nel <- list(atlist=NULL, dat=NULL)
   #Remove #
   ff <- gsub('^[[:space:]]*#[[:space:]]*', '',ff)
   if (!length(grep('^<', ff))) {
      return(NULL)
   }
   #strt markers
   strv <- grep ('<', ff)
   #stp markers
   stpv <- grep ('>', ff)
   #check
   if (length(strv) != length(stpv)) {
      err.AFNI("Have extra brackets");
      return(NULL)
   }
   if (length(strv) < 1) {
      err.AFNI("Have nothing");
      return(NULL)
   }

   #If you have a group, jump to next element.
   shead <- ff[strv[1]:stpv[1]]
   if (length(grep('ni_form[[:space:]]*=[[:space:]]*\"ni_group\"', shead))
       && stpv[1]+1<length(ff)) {
      #try again
      return(r.NI_read_str_element(ff[stpv[1]+1:length(ff)], HeadOnly))
   }

   #Get only the first element, for now
   for (i in 1:1) {
      shead <- ff[strv[i]:stpv[i]]
      #get the name
      nel$name <- strsplit(shead[1],'<')[[1]][2]
      nel$atlist <- vector()
      #remove last > from shead
      shead[length(shead)] <- sub('>$','',shead[length(shead)])
      for (j in 2:length(shead)) {
         attr <- strsplit(shead[j],'=')[[1]]
         if (length(attr) == 1) {
            nel <- r.NI_set_attribute(nel, attr[1], "")
         } else if (length(attr) == 2) {
            nel <- r.NI_set_attribute(nel, attr[1], attr[2])
         } else if (length(attr) > 2) {
            err.AFNI(paste("Parse error for ", shead[j]));
         }
      }
   }

   if (HeadOnly) return(nel)

   #Get the data part, the lazy way
   #All the content here is text. Not sure what to do with
   #this next. Wait till context arises
   tp <- r.NI_get_attribute(nel,"ni_type");
   if (tp == 'String') {
      for (i in (stpv[1]+1):(strv[2]-1)) {
         if (is.null(nel$dat))
            nel$dat <- ff[i]
         else nel$dat <- c(nel$dat, ff[i])
      }
   } else {
      for (i in (stpv[1]+1):(strv[2]-1)) {
         #browser()
         if (is.null(nel$dat))
            nel$dat <- rbind(r.NI_dequotestring(
               strsplit(deblank.string(ff[i]),split=' ')[[1]]))
         else nel$dat <- rbind(nel$dat,
                               r.NI_dequotestring(strsplit(
                                  deblank.string(ff[i]),split=' ')[[1]]))
      }
   }
   return(nel)
}


is.NI.file <- function (fname, asc=TRUE, hs=TRUE) {
   fnp <- parse.AFNI.name(fname)

   if (!file.exists(fnp$file)) {
      return(FALSE)
   }

   ff <- scan(fnp$file, what = 'character', nmax = 2, sep = '\n', quiet=TRUE)

   if (asc && hs) {
      if (!length(grep('^[[:space:]]*#[[:space:]]*<', ff))) {
         return(FALSE)
      } else {
         return(TRUE)
      }
   }
   return(FALSE)
}

apply.AFNI.matrix.header <- function (fname, mat,
                                      brsel=NULL, rosel=NULL,rasel=NULL,
                                      nheadmax = 10, checkNI=TRUE) {
   attr(mat,'name') <- 'noname'
   attr(mat,'FileName') <- fname

   fnp <- parse.AFNI.name(fname)

   if (!file.exists(fnp$file)) {
      return(mat)
   }

   #Does this look 1D nimly?
   if (checkNI && !is.NI.file(fnp$file, asc=TRUE, hs=TRUE)) {
      return(mat)
   }

   nel <- r.NI_read_element(fnp$file, HeadOnly = TRUE)

   # Common attributes
   attr(mat,'name') <- nel$name
   if (!is.null(labels <-
                r.NI_get_attribute(nel, 'ColumnLabels', brsel, colwise=TRUE))){
      if (length(labels) == ncol(mat)) colnames(mat) <- labels
   }

   if (nel$name == 'matrix') {
      if (!is.null(colg <-
                   r.NI_get_attribute(nel, 'ColumnGroups', brsel,
                                      colwise=TRUE, is1Dstr=TRUE))){
         if (length(colg) == ncol(mat)) attr(mat,'ColumnGroups') <- colg
         if (!is.null(labels)) {
            llv <- vector(length=0,mode="numeric")
            tcolg <- unique(colg)
            for (i in tcolg) {
               if (i>0) {
                  ll <- which(colg == i)
                  llv <- c(llv,ll[1])
               }
            }
            tnames <-paste(strsplit(labels[llv],"#0"))
            attr(mat,'TaskNames') <- tnames
         }
      }

      if (!is.null(TR <- r.NI_get_attribute(nel, 'RowTR'))){
         attr(mat, 'TR') <- as.double(TR)
      }
   } else if (nel$name == 'DICE') {
   } else if (nel$name == '3dhistog' || nel$name == 'seg_histogram') {
      if (!is.null(bw <- r.NI_get_attribute(nel, 'BinWidth'))){
         attr(mat, 'BinWidth') <- as.double(bw)
      }
      if (!is.null(bw <- r.NI_get_attribute(nel, 'window'))){
         attr(mat, 'BinWidth') <- as.double(bw)
      }
      if (!is.null(bw <- r.NI_get_attribute(nel, 'xlabel'))){
         attr(mat, 'xlabel') <- bw
      }
   } else {
      if (0) { #No need to whine
         warn.AFNI(paste(
            "Don't know what to do with attribute of element ", nel$name));
      }
   }


   return(mat)
}


read.AFNI.matrix.test <- function(verb=1) {
   cat ( 'Running read.AFNI.matrix in test mode\n',
         'See read.AFNI.matrix.test for details' )
   i <- 0
   mm <- paste ( 'subj age weight height\n',
                 'joe   13  299  123   \n',
                 'jane  22  600   234   \n',
                 'jim   2   188   23\n',
                 sep='', collapse='');
   fouts <- sprintf('___fout%02d.1D', i);
   cat (mm,file=fouts);

   comm <- 'read.AFNI.matrix(fouts, verb=verb)'
   note.AFNI(sprintf("Working with fouts=%s:\n   %s", fouts, comm))
   print(eval(parse(text=comm)))

   comm <- paste("read.AFNI.matrix(fouts, verb=verb,",
                 "userrownames=c('jim','jane'))",
                 sep='', collapse='')
   note.AFNI(sprintf("Working with fouts=%s:\n   %s", fouts, comm))
   print(eval(parse(text=comm)))

   comm <- paste("read.AFNI.matrix(fouts, verb=verb, ",
                 "userrownames=c('jim','jane'),",
                 "usercolnames=c('weight','age'))",
                 sep='', collapse='')
   print(eval(parse(text=comm)))

   i<- i+1
   mm <- paste ( ' age weight height\n',
                 ' 13  299  123   \n',
                 ' 22  600   234   \n',
                 ' 2   188   23\n',
                 sep='', collapse='');
   fouts <- sprintf('___fout%02d.1D', i);
   cat (mm,file=fouts);
   note.AFNI(sprintf("Working with %s", fouts))

   comm <- 'read.AFNI.matrix(fouts, verb=verb)'
   note.AFNI(sprintf("Working with fouts=%s:\n   %s", fouts, comm))
   print(eval(parse(text=comm)))

   comm <- paste("read.AFNI.matrix(fouts, verb=verb,",
                 "usercolnames=c('height','weight,','age'))",
                 sep='', collapse='')
   note.AFNI(sprintf("Working with fouts=%s:\n   %s", fouts, comm))
   print(eval(parse(text=comm)))

   i<- i+1
   mm <- paste ( ' 13  299  123   \n',
                 ' 22  600   234   \n',
                 ' 2   188   23\n',
                 sep='', collapse='');

   fouts <- sprintf('___fout%02d.1D', i);
   cat (mm,file=fouts);
   note.AFNI(sprintf("Working with %s", fouts))
   print(read.AFNI.matrix(fouts, verb=verb))
   print(read.AFNI.matrix(fouts, verb=verb, usercolnames=c('col02'),
                          userrownames=c('row03','row01','row01')))

   i<- i+1
   mm <- paste ( '  heft   \n',
                 '  299    \n',
                 '  600     \n',
                 '  188     \n',
                 sep='', collapse='');
   fouts <- sprintf('___fout%02d.1D', i);
   cat (mm,file=fouts);
   note.AFNI(sprintf("Working with %s", fouts))
   print(read.AFNI.matrix(fouts, verb=verb))
   print(read.AFNI.matrix(fouts, verb=verb, usercolnames=c('heft')))

   i<- i+1
   mm <- paste ( '  299    \n',
                 '  600     \n',
                 '  188     \n',
                 sep='', collapse='');
   fouts <- sprintf('___fout%02d.1D', i);
   note.AFNI(sprintf("Working with %s", fouts))
   cat (mm,file=fouts);
   print(read.AFNI.matrix(fouts, verb=verb))

   i <- i+1
   mm <- paste ( 'subj age \n',
                 'joe   13  \n',
                 'jane  22 \n',
                 'jim   2  \n',
                 sep='', collapse='');
   fouts <- sprintf('___fout%02d.1D', i);
   cat (mm,file=fouts);

   comm <- 'read.AFNI.matrix(fouts, verb=verb)'
   note.AFNI(sprintf("Working with fouts=%s:\n   %s", fouts, comm))
   print(eval(parse(text=comm)))

   comm <- paste("read.AFNI.matrix(fouts, verb=verb,",
                 "userrownames=c('jim','jane'))",
                 sep='', collapse='')
   note.AFNI(sprintf("Working with fouts=%s:\n   %s", fouts, comm))
   print(eval(parse(text=comm)))


   for (j in 0:i) {
      system(sprintf('\\rm -f ___fout%02d.1D', i));
   }
}


read.AFNI.matrix <- function (fname,
                              usercolnames=NULL,
                              userrownames=NULL,
                              checkNI = TRUE, verb = 0) {
   if (length(fname)>1) {
      err.AFNI(paste("Cannot handle more than one name.\nHave ",
                     paste(fname,collapse=' '), sep=''))
      return(NULL);
   }
   if (fname == '-self_test') {
      read.AFNI.matrix.test()
      return(NULL);
   }

   if (!is.null(mm <- eval.AFNI.string(fname))) {
      #Might need to add some names someday...
      attr(mm,'FileName') <- paste('STR<',fname,'>',sep='')
      return(as.matrix(mm))
   }

   if (verb) cat(who.called.me())

   if (is.character(fname)) {
      fname <- parse.AFNI.name(fname)
      fnameattr <- fname$orig_name
   }else{
      fnameattr <- 'NONAME'
   }

   if (fname$type == 'NIML') {
      nmout <- sprintf('/tmp/fout.%s.1D.dset', newid.AFNI())
      if (verb) warn.AFNI("Clumsy handling of NIML files via ConvertDset ...");
      com <- paste(
         'ConvertDset -overwrite -o_1D -prefix ', nmout, ' -i',
         fname$orig_name);
      ss <- sys.AFNI(com, echo = FALSE);
      if (ss$stat == 1) {
         err.AFNI(paste("Failed to get keys from labeltable"));
         return(NULL);
      }
      mm<-read.AFNI.matrix(nmout);
      sys.AFNI(sprintf('\\rm -f %s',nmout));
      return(mm);
   } else {
      #str(fname)
      #fname$file
      brk <- NULL
      brk <- tryCatch({read.table(fname$file, colClasses='character')},
                      error=function(a){})
      if (is.null(brk)) { #try as niml, just in case
         if (verb) note.AFNI(paste("Attempting read as NIML."), callstr='');
         fff <- r.NI_read_element(fname$file, FALSE)
         if (!is.null(fff$dat)) {
            brk <- as.data.frame(fff$dat, stringsAsFactors=FALSE)
            checkNI = FALSE;
         } else {
            err.AFNI(paste("Failed to read matrix from ", fname$file,".\n"));
            return(NULL);
         }
      }
   }
   if ( tolower(brk$V1[1]) == 'name' ||
        tolower(brk$V1[1]) == 'subj' ||
        tolower(brk$V1[1]) == '#file') {
      subjCol <- brk$V1[2:dim(brk)[1]];
      covNames <- paste(brk[1,2:dim(brk)[2]]);
      if (dim(brk)[2]-1 == 1) {
         covMatrix <- as.matrix(as.numeric(brk[2:dim(brk)[1],2]))
      } else {
         for (ii in 1:(dim(brk)[2]-1)) { #Add one column at a time
            if (ii==1) {
               covMatrix <- cbind(
                  as.numeric(brk[2:dim(brk)[1],2:dim(brk)[2]][[ii]]));
            } else {
               covMatrix <- cbind(covMatrix,
                                  as.numeric(brk[2:dim(brk)[1],2:dim(brk)[2]][[ii]]));
            }
         }
      }
   }  else {
      flg <- tryCatch({as.numeric(brk$V1[1])}, warning=function(aa) {});
      if (is.null(flg)) { #Just labels
         covNames <- paste(brk[1,1:dim(brk)[2]]);
         subjCol <- paste('row',sprintf('%02d',c(1:(dim(brk)[1]-1))), sep='')
         istrt<- 2
      }else {  #completely naked
         ccc <- trim.string(fname$prefix, nchar=10, left=FALSE, strim='..');
         covNames <- paste(ccc,sprintf(' c%02d',c(1:dim(brk)[2])),sep='');
         subjCol <- paste(ccc,sprintf(' r%02d',c(1:dim(brk)[1])), sep='')
         istrt<- 1
      }
      if (dim(brk)[2] == 1) {
         covMatrix <- as.matrix(as.numeric(brk[istrt:dim(brk)[1],1]))
      } else {
         for (ii in 1:(dim(brk)[2])) { #Add one column at a time
            ccc <- tryCatch(
               {as.numeric(brk[istrt:dim(brk)[1],1:dim(brk)[2]][[ii]])},
               warning=function(aa) {} )
            if (is.null(ccc)) {
               warn.AFNI(paste("Failed to process column ",
                               ii-1, " in ", fnameattr,
                               ". Using NA instead"))
               ccc <- NA*vector(length=dim(brk)[1]-istrt+1)
            }
            if (ii==1) {
               covMatrix <- cbind(ccc);
            } else {
               covMatrix <- cbind(covMatrix,ccc);
            }
         }
      }
   }


   if (verb>2) {
      note.AFNI("Browser here, not active");
      #browser()
   }
   rownames(covMatrix) <- subjCol;
   colnames(covMatrix) <- covNames;

   #And now apply selectors
   if (!is.null(fname$brsel)) {
      sbsel <- eval.AFNI.1D.string(fname$brsel, nmax=dim(covMatrix)[2]-1)
      if (min(sbsel) < 0 || max(sbsel)>=dim(covMatrix)[2]) {
         err.AFNI(
            sprintf('column selection outside possible range of <0,%d> in %s',
                    dim(covMatrix)[2]-1, fname$file));
         return(NULL);
      }
      covMatrix <- covMatrix[,sbsel+1, drop=FALSE]
   } else sbsel <- NULL

   if (!is.null(fname$rosel)) {
      rosel <- eval.AFNI.1D.string(fname$rosel, nmax=dim(covMatrix)[1]-1)
      if (min(rosel) < 0 || max(rosel)>=dim(covMatrix)[1]) {
         err.AFNI(
            sprintf('row selection outside possible range of <0,%d> in %s',
                    dim(covMatrix)[1]-1, fname$file));
         return(NULL);
      }
      covMatrix <- covMatrix[rosel+1,, drop=FALSE]
   } else rosel <- NULL

   if (!is.null(fname$rasel)) {
      err.AFNI('Not ready to deal with range selection');
      return(NULL);
   } else rasel <- NULL

   #Now, reorder per user*names
   if (!is.null(userrownames)) {
      dd <- userrownames[!(userrownames %in% subjCol)]
      if (length(dd)) {
         warning (paste('Row(s) "', paste(dd,collapse=' '),
                        '" do(es) not have an entry.\n'),
                  immediate.=TRUE);
         return(NULL);
      }

      for (ii in 1:length(userrownames)) {
         if (ii==1) {
            mm <- rbind(covMatrix[userrownames[ii],]);
         } else {
            mm <- rbind(mm, covMatrix[userrownames[ii],]);
         }
      }
      rownames(mm) <- userrownames
      if(length(covNames)) colnames(mm) <- covNames
      covMatrix <- mm
   }
   if (!is.null(usercolnames)) {
      dd <- usercolnames[!(usercolnames %in% covNames)]
      if (length(dd)) {
         warning (paste('Column(s) "', paste(dd,collapse=' '),
                        '" do(es) not have an entry.\n'),
                  immediate.=TRUE);
         return(NULL);
      }

      for (ii in 1:length(usercolnames)) {
         if (ii==1) {
            mm <- cbind(covMatrix[,usercolnames[ii]]);
         } else {
            mm <- cbind(mm, covMatrix[,usercolnames[ii]]);
         }
      }
      colnames(mm) <- usercolnames
      covMatrix <- mm
   }

   covMatrix <- apply.AFNI.matrix.header(fnameattr, covMatrix,
                                         brsel=sbsel, rosel=rosel,
                                         rasel=rasel,checkNI = checkNI)

   return(covMatrix)
}




#See README.attributes's SCENE_DATA and niml_stat.c's distname[]

header.version <- function(hh, defmeth='UNKNOWN') {
   if (defmeth == 'AUTO') {
      if (have_R_io()) defmeth <- 'clib' else defmeth <- 'Rlib'
   }
   if (!is.null(hh) && length(hh)>0) {
      if (is.null(names(hh[[1]]))) return('Rlib');
      if (length(which("atlist" == names(hh[[1]]))) > 0) return('clib');
      #Cannot tell, return default
      return(defmeth)
   }
   return(defmeth)
}




dimBRKarray <- function(brk=NULL) {
   d <- c(1,1,1,1)
   if (is.array(brk)) dd <- dim(brk)
   else if (is.vector(brk)) dd <- length(brk)
   else {
      note.AFNI("Don't know what to do with this brk")
      return(NULL)
   }
   d[1:length(dd)]<-dd
   return(d)
}



typecode.AFNI <- function(typestr, def='MRI_short') {
   if (is.null(typestr)) return(typecode.AFNI(def))
   if (is.character(typestr)) {
      if (typestr == 'MRI_byte' || typestr == 'byte') return(0)
      if (typestr == 'MRI_short' || typestr == 'short') return(1)
      if (typestr == 'MRI_int' || typestr == 'int') return(2)
      if (typestr == 'MRI_float' || typestr == 'float') return(3)
      if (typestr == 'MRI_double' || typestr == 'double') return(4)
      if (typestr == 'MRI_complex' || typestr == 'complex') return(5)
      if (typestr == 'MRI_rgb' || typestr == 'rgb') return(6)
      err.AFNI(paste('Bad typecode ', typestr));
      return(NULL);
   } else {
      if (typestr < 0  || typestr >6) {
         err.AFNI(paste('Bad typecode ', typestr));
         return(NULL);
      }
      return(typestr);
   }
   err.AFNI(paste('Should not be here ', typestr));
   return(NULL);
}

orcode.AFNI <- function(orstr) {
   if (is.character(orstr)) {
      orcode <- c (-1,-1,-1)
      orstr <- strsplit(orstr,'')[[1]]
      for (i in 1:3) {
         switch (tolower(orstr[i]),
                 r = orcode[i] <- 0,
                 l = orcode[i] <- 1,
                 p = orcode[i] <- 2,
                 a = orcode[i] <- 3,
                 i = orcode[i] <- 4,
                 s = orcode[i] <- 5)
         if (orcode[i] < 0) {
            err.AFNI(paste('Bad orientation code ', orstr));
            return(NULL)
         }
      }
   } else {
      for (i in 1:3) {
         orcode <- orstr
         if (length(orcode) != 3 || orcode[i] < 0 || orcode[i] > 5) {
            err.AFNI(paste('Bad orientation code ', orstr));
            return(NULL)
         }
      }
   }
   return(orcode);
}

#------------------------------------------------------------------
# Extracted (and modified) from fmri library by Karsten Tabelow,
# tabelow@wias-berlin.de and Joerg Polzehl (polzehl@wias-berlin.de)
#
# Updates by ZSS & GC
#------------------------------------------------------------------



#Calculate the min, and max of BRIK data y
minmax <- function(y) {
   r <- NULL;
   for (k in 1:dim(y)[4]) {
      r <- c(r,min(y[,,,k]),max(y[,,,k]))
   };
   return(r);
}




head.AFNI.name <- function(an) {
   if (is.character(an)) an <- parse.AFNI.name(an);
   if (an$type == 'BRIK' && !is.na(an$view)) {
      return(paste(an$pprefix,an$view,".HEAD",sep=''));
   } else {
      return((an$orig_name));
   }
}

brik.AFNI.name <- function(an) {
   if (is.character(an)) an <- parse.AFNI.name(an);
   if (an$type == 'BRIK' && !is.na(an$view)) {
      return(paste(an$pprefix,an$view,".BRIK",sep=''));
   } else {
      return((an$orig_name));
   }
}

compressed.AFNI.name <- function(an) {
   if (is.character(an)) an <- parse.AFNI.name(an);
   if (length(grep('\\.gz$', an$ext))) {
      return('gz')
   } else if (length(grep('\\.bz2$', an$ext))) {
      return('bz2')
   } else if (length(grep('\\.Z$', an$ext))) {
      return('Z')
   } else {
      return('')
   }

}
strip.extension <- function (filename, extvec=NULL, verb=0) {
   n <- list()
   if (is.null(extvec)) {
      ff <- strsplit(filename, '\\.')[[1]]
      if (length(ff) > 1) {
         n$ext <- paste('.',ff[length(ff)], sep='')
         n$name_noext <- paste(ff[1:length(ff)-1],collapse='.')
      } else {
         n$ext <- ''
         n$name_noext <- filename
      }
   } else {
      n$ext <- ''
      n$name_noext <- filename
      for (ex in extvec) {
         patt <- paste('\\',ex,'$',collapse='', sep='')
         if (length(grep(patt, filename))) {
            n$ext <- ex
            n$name_noext <- sub(patt,'',filename)
            return(n)
         }
      }
   }
   return(n)
}

parse.name <- function (filename, extvec=NULL, verb=0) {
   n <- list()
   ff <- strsplit(filename, .Platform$file.sep)[[1]]
   n$name <- ff[length(ff)]
   n$path <- '.'
   if (length(ff)>1)
      n$path <- paste(ff[1:length(ff)-1],collapse=.Platform$file.sep)
   n$path <- paste(n$path, .Platform$file.sep, sep="")

   n2 <- strip.extension(n$name, extvec, verb)
   n$ext <- n2$ext
   n$name_noext <- n2$name_noext

   return(n)
}

is.AFNI.1D.string <- function(t) {
   if (length(grep('^1D:',t))) return(TRUE)
   return(FALSE)
}

eval.AFNI.string.help <- function() {
   return("
Data Strings:
-------------
You can specify input matrices and vectors in a variety of
ways. The simplest is by specifying a .1D file with all
the trimmings of column and row selectors. You can also
specify a string that gets evaluated on the fly.
For example: '1D: 1 4 8' evaluates to a vector of values 1 4 and 8.
Also, you can use R expressions such as: 'R: seq(0,10,3)'
")
}

eval.AFNI.1D.string <- function (t, verb=0, nmax=0) {
   #remove 1D:
   t <- sub("^1D:","",t)
   #any transpose?
   doTr = FALSE
   if (length(grep("'$",t))) {
      t<-sub("'$",'',t)
      doTr = TRUE
   }
   #replace commas with space
   t<-gsub(",",' ',t)

   #remove multiple blanks
   t <- deblank.string(t, middle=TRUE)

   vvf <- vector(length = 0, mode="numeric")
   #replace .. with : and split at 'space'
   s <- strsplit(sub("..",":",t, fixed=TRUE), " ")[[1]]

   #replace $ with nmax if possible
   s <- gsub("[$]",as.character(nmax),s)

   #Now loop and form vector of components
   for (si in s) {
      if (verb) cat ("working ", si, "\n")
      if (length(grep(":",si))) {
         sss <- strsplit(si,'[(*)]')[[1]]
         if (length(sss)>1) {
            se <- sss[2]

            si <- strsplit(sss[1],":")[[1]]
            vv <- eval(parse(text=sprintf('seq(from=%s,to=%s,by=%s)',
                                          si[1], si[2], se) ))
         }  else {
            vv <- eval(parse(text=si))
         }
      } else if (length(grep("@",si))) {
         ssi = as.numeric(strsplit(si,"@")[[1]])
         #cat ("ssi = ", ssi, "\n")
         vv = rep(ssi[2], ssi[1])
      } else {
         vv = as.numeric(si)
      }
      #cat(si," = ",vv, "\n")
      vvf <- c(vvf, vv)
      #cat("vvnow = ",vvf, "\n")
   }
   if (doTr) return(t(vvf))
   else return(vvf)
}

is.AFNI.R.string <- function(t) {
   if (length(grep('^R:',t))) return(TRUE)
   return(FALSE)
}

eval.AFNI.R.string <- function (t) {
   t <- sub("^R:","",t)
   return(eval(parse(text=t)))
}

eval.AFNI.string <- function (t) {
   if (is.AFNI.1D.string(t)) return(eval.AFNI.1D.string(t))
   else if (is.AFNI.R.string(t)) return(eval.AFNI.R.string(t))
   else return(NULL)
}

date.stamp <- function (fancy=FALSE) {
   if (fancy) {
      return(gsub(' ','_',date()))
   } else {
      return(format(Sys.time(), "%d%m%y-%H%M%S"))
   }
}

parse.AFNI.name.selectors <- function(filename,verb=0) {
   n <- list()
   n$brsel<- NULL;
   n$rosel<- NULL;
   n$rasel<- NULL;
   n$insel<- NULL;

   selecs <- strsplit(filename,"\\[|\\{|<|#")[[1]];
   n$name <- selecs[1]
   for (ss in selecs[2:length(selecs)]) {
      if (length(grep("]",ss))) {
         n$brsel <- strsplit(ss,"\\]")[[1]][1];
      } else if (length(grep("}",ss))) {
         n$rosel <- strsplit(ss,"\\}")[[1]][1];
      } else if (length(grep(">",ss))) {
         n$rasel <- strsplit(ss,">")[[1]][1];
      }
   }
   selecs <- strsplit(filename,"#")[[1]];
   if (length(selecs) > 1) {
      n$insel <- selecs[2]
   }

   return(n)
}

parse.AFNI.name <- function(filename, verb = 0) {
   if (filename == '-self_test') { #Secret testing flag
      note.AFNI('Function running in test mode');
      show.AFNI.name(parse.AFNI.name('DePath/hello.DePrefix', verb))
      show.AFNI.name(parse.AFNI.name('DePath/DePrefix+acpc', verb))
      show.AFNI.name(parse.AFNI.name('DePath/DePrefix+acpc.', verb))
      show.AFNI.name(parse.AFNI.name('DePath/DePrefix+acpc.HEAD', verb))
      show.AFNI.name(parse.AFNI.name('DePath/DePrefix+acpc.BRIK.gz', verb))
      show.AFNI.name(parse.AFNI.name('DePath/DePrefix+acpc.HEAD[23]', verb))
      show.AFNI.name(
         parse.AFNI.name('DePath/DePrefix+acpc.HEAD[DeLabel]{DeRow}', verb))
      show.AFNI.name(
         parse.AFNI.name('DePath/DePrefix+acpc[DeLabel]{DeRow}', verb))
      show.AFNI.name(
         parse.AFNI.name('DePath/DePrefix+acpc.[DeLabel]{DeRow}', verb))
      return(NULL)
   }
   an <- list()
   an$view <- NULL
   an$pprefix <- NULL
   an$brsel <- NULL;
   an$rosel <- NULL;
   an$rasel <- NULL;
   an$insel <- NULL;
   an$type <- NULL;
   an$path <- NULL;
   an$orig_name <- filename;
   an$file <- NULL;

   if (verb) { cat ('Parsing >>',filename,'<<\n', sep=''); }
   if (!is.character(filename)) {
      warning(paste('filename >>',
                    filename, '<< not a character string\n', sep=''),
              immediate. = TRUE);
      traceback();
      return(NULL);
   }
   #Deal with special names:
   if (length(grep("^1D:.*$",filename))) {
      an$type = '1Ds'
      return(an)
   } else if (length(grep("^R:.*$",filename))) {
      an$type = 'Rs'
      return(an)
   }

   #Deal with selectors
   n <- parse.AFNI.name.selectors(filename, verb)
   filename <- n$name
   an$file  <- n$name
   an$brsel <- n$brsel;
   an$rosel <- n$rosel;
   an$rasel <- n$rasel;
   an$insel <- n$insel;

   #Remove last dot if there
   filename <- sub('\\.$','',filename)

   #NIFTI?
   n <- strip.extension(filename, c('.nii', '.nii.gz'), verb)
   if (n$ext != '') {
      an$ext <- n$ext
      an$type <- 'NIFTI'
      an$pprefix <- n$name_noext
   } else {
      #remove other extensions
      n <- strip.extension(filename, c('.HEAD','.BRIK','.BRIK.gz',
                                       '.BRIK.bz2','.BRIK.Z',
                                       '.1D', '.1D.dset',
                                       '.niml.dset',
                                       '.'  ),
                           verb)
      if (n$ext == '.1D' || n$ext == '.1D.dset') {
         an$type <- '1D'
      } else if (n$ext == '.niml.dset') {
         an$type <- 'NIML'
      } else {
         an$type <- 'BRIK'
      }

      if (n$ext == '.') {
         n$ext <- ''
      }
      an$ext <- n$ext
      filename <- n$name_noext

      n <- strip.extension(filename, c('+orig','+tlrc','+acpc'), verb)
      if (n$ext != '') {
         an$view <- n$ext
      } else {
         an$view <- NA
      }
      an$pprefix <- n$name_noext
   }

   #a prefix with no path
   an$prefix <- basename(an$pprefix)

   #and the path
   an$path <- dirname(an$orig_name)

   if (verb > 2) {
      note.AFNI("Browser not active");
      # browser()
   }
   if (  an$type != '1D' && (
      !is.null(an$brsel) || !is.null(an$rosel) ||
      !is.null(an$rasel) || !is.null(an$insel))) {
      #Remove trailing quote if any
      an$prefix <- gsub("'$", '', an$prefix);
      an$prefix <- gsub('"$', '', an$prefix);
      an$pprefix <- gsub("'$",'', an$pprefix);
      an$pprefix <- gsub('"$','', an$pprefix);
   }

   if ( an$type != 'BRIK' ) {
      #Put the extension back on
      an$pprefix <- paste(an$pprefix,an$ext, sep='');
      an$prefix <- paste(an$prefix,an$ext, sep='');
   }
   return(an)
}


read.AFNI <- function(filename, verb = 0, ApplyScale = 1, PercMask=0.0,
                      meth = 'AUTO', forcedset = FALSE) {

   an <- parse.AFNI.name(filename);

   #If you have any selectors, use 3dbucket to get what you want, then read
   #temp dset. This is an ugly fix for now, but will change it later if
   #I/O is issue

   rmtmp <- 0;
   if (!is.null(an$brsel) || !is.null(an$rosel) ||  !is.null(an$rasel)) {
      rmtmp <- 1;
      #Changed below from >& /dev/null to > /dev/null 2>&1
      #because system uses sh not tcsh
      #Tx to G. Pagnoni & Co.
      com <- paste ('3dcalc -overwrite -prefix ___R.read.AFNI.' ,
                    basename(an$pprefix),
                    ' -a "', filename,'" -expr "a" > /dev/null 2>&1',
                    sep = '');
      if (try(system(com)) != 0) {
         warning(paste("Failed to execute:\n   ", com),
                 immediate. = TRUE);
         return(NULL);
      }
      an$pprefix <- paste('___R.read.AFNI.',basename(an$pprefix), sep = '');
      if (!(exists.AFNI.name(head.AFNI.name(an)))) {
         warning(paste("Failed to create:   ",
                       head.AFNI.name(an), brik.AFNI.name(an), '\n'),
                 immediate. = TRUE);
         return(NULL);
      }
   }

   if (!(exists.AFNI.name(head.AFNI.name(an)))) {
      err.AFNI(paste("Failed to read:   ", head.AFNI.name(an),
                     brik.AFNI.name(an)));
      return(NULL);
   }

   #Cannot read compressed stuff (see size usage below)
   uncompress.AFNI(head.AFNI.name(an));

   conhead <- file(head.AFNI.name(an),"r")
   header <- readLines(conhead)
   close(conhead)

   types <- NULL
   args <- NULL
   counts <- NULL
   values <- NULL

   for (i in 1:length(header)) {
      if (regexpr("^type *= *", header[i]) != -1) {
         tmptype <- strsplit(header[i]," *= *")[[1]][2]
         types <- c(types,tmptype)
         args <- c(args,strsplit(header[i+1]," *= *")[[1]][2])
         tmpcounts <- as.numeric(strsplit(header[i+2]," *= *")[[1]][2])
         counts <- c(counts,tmpcounts)
         i <- i+3
         tmpvalue <- ""
         while ((regexpr("^$", header[i]) == -1) && (i <= length(header))) {
            tmpvalue <- paste(tmpvalue,header[i])
            i <- i+1
         }
         tmpvalue <- sub("^ +","",tmpvalue)
         if ((tmptype == "integer-attribute") || (tmptype == "float-attribute")) {
            tmpvalue <- as.numeric(strsplit(tmpvalue," +")[[1]])
         }
         values <- c(values,list(value=tmpvalue))
      }
   }

   names(values) <- args

   dx <- values$DATASET_DIMENSIONS[1]
   dy <- values$DATASET_DIMENSIONS[2]
   dz <- values$DATASET_DIMENSIONS[3]
   dt <- values$DATASET_RANK[2]
   scale <- values$BRICK_FLOAT_FACS

   size <- file.info(brik.AFNI.name(an))$size/(dx*dy*dz*dt)
   if (is.na(size)) {
      err.AFNI("Failed to determine file size");
      return(NULL);
   }
   if (regexpr("MSB",values$BYTEORDER_STRING[1]) != -1) {
      endian <- "big"
   } else {
      endian <- "little"
   }

   if (min(abs(values$DELTA)) != 0) {
      weights <-
         abs(values$DELTA/min(abs(values$DELTA)))
   } else {
      weights <- NULL
   }

   #  browser()
   if (verb) { cat ('Reading Bin\n'); }
   if (as.integer(size) == size) {
      conbrik <- file(brik.AFNI.name(an),"rb")
      # modified below by GC 12/2/2008
      if (all(values$BRICK_TYPES==0) | all(values$BRICK_TYPES==1)) {
         mybrk<- readBin( conbrik, "int", n=dx*dy*dz*dt, size=size,
                          signed=TRUE, endian=endian)
      } else if (all(values$BRICK_TYPES==3)) {
         mybrk<- readBin(conbrik, "numeric", n=dx*dy*dz*dt, size=size,
                         signed=TRUE, endian=endian) # float
      } else {
         err.AFNI("Cannot read datasets of multiple data types");
         close(conbrik)
         return(NULL);
      }
      close(conbrik)
      dim(mybrk) <- c(dx,dy,dz,dt)

      if (ApplyScale) {
         if (verb) { cat ('Scaling\n'); }
         #After this operation, size of mytt doubles if initially read as int
         for (k in 1:dt) if (scale[k] != 0) mybrk[,,,k] <- scale[k] * mybrk[,,,k]
      }

      mask=NULL;
      if (PercMask > 0.0) { #ZSS: Dunno what that is for.
         #     0.75 was default for PercMask
         mask <- array(TRUE,c(dx,dy,dz))
         mask[mybrk[,,,1] < quantile(mybrk[,,,1],PercMask)] <- FALSE
      }
      z <- list(brk=mybrk,format=an$type,delta=values$DELTA,
                origin=values$ORIGIN,
                orient=values$ORIENT_SPECIFIC,
                dim=c(dx,dy,dz,dt),weights=weights, header=values,mask=mask)
   } else {
      warning("Error reading file: Could not detect size per voxel\n")
      z <- list(brk=NULL,format=an$type,delta=NULL,
                origin=NULL,orient=NULL,dim=NULL,weights=NULL,
                header=values,mask=NULL)
   }

   class(z) <- "AFNI_R_dataset"
   attr(z,"file") <- paste(filename,"BRIK",sep="")

   if (rmtmp == 1) {
      if (verb) {
         cat ('ZSS: Will remove tmp files\n');
      }
      #Changed below from >& to 2&>1 because system uses sh not tcsh
      #Tx to G. Pagnoni & Co.
      system('\\rm -f ___R.read.AFNI.* > /dev/null 2>&1');
   }else{
      if (verb) {
         cat ('ZSS: No temps to remove\n');
      }
   }

   invisible(z);
}
