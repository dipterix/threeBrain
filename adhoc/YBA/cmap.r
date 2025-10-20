local({
  con <- "adhoc/YBA/YBA_696_parcel_dict.csv"
  tbl <- utils::read.csv(con)
  name <- tbl$Long_name
  # name <- gsub("^Left", "lh", name, ignore.case = TRUE)
  # name <- gsub("^Right", "rh", name, ignore.case = TRUE)
  # name <- gsub(" gyrus ", " G ", name, ignore.case = TRUE)
  name <- gsub(" ", "_", name)
  tbl <- data.frame(
    ColorID = c(0L, seq_len(nrow(tbl))),
    Label = c("Unknown", name),
    R = c(0, tbl$YBA_R_color),
    G = c(0, tbl$YBA_G_color),
    B = c(0, tbl$YBA_B_color)
  )
  col <- rgb(tbl$R, tbl$G, tbl$B, maxColorValue = 255)
  threeBrain::create_colormap(gtype = 'volume', dtype = 'discrete', key = tbl$ColorID,
                  color = col, value = tbl$Label, alpha = FALSE,
                  con = 'inst/palettes/datacube2/YBA696ColorLUT.json')
})

local({
  con <- "adhoc/YBA/YBA_690_parcel_dict.csv"
  tbl <- utils::read.csv(con)
  name <- tbl$Long_name
  # name <- gsub("^Left", "lh", name, ignore.case = TRUE)
  # name <- gsub("^Right", "rh", name, ignore.case = TRUE)
  # name <- gsub(" gyrus ", " G ", name, ignore.case = TRUE)
  name <- gsub(" ", "_", name)
  tbl <- data.frame(
    ColorID = c(0L, seq_len(nrow(tbl))),
    Label = c("Unknown", name),
    R = c(0, tbl$YBA_R_color),
    G = c(0, tbl$YBA_G_color),
    B = c(0, tbl$YBA_B_color)
  )
  col <- rgb(tbl$R, tbl$G, tbl$B, maxColorValue = 255)
  threeBrain::create_colormap(gtype = 'volume', dtype = 'discrete', key = tbl$ColorID,
                  color = col, value = tbl$Label, alpha = FALSE,
                  con = 'inst/palettes/datacube2/YBA690ColorLUT.json')
})


a = read.csv("adhoc/YBA/YBA_690_parcel_dict.csv")
b = read.table('adhoc/YBA/YBA_690_parcel_dict.csv', sep = "\t")

idx <- which(a$Long_name[seq_len(nrow(b))] != trimws(b$V2))
idx # int[0]
