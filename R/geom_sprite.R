#' R6 Class - Generate Sphere Geometry
#' @author Zhengjia Wang
#' @name SpriteGeom
NULL

#' @export
SpriteGeom <- R6::R6Class(
  classname = 'SpriteGeom',
  inherit = AbstractGeom,
  public = list(

    clickable = FALSE,
    type = 'imagesprite',
    image_uri = "",
    aspect_ratio = 1.0,

    initialize = function(name, image_path,
                          entry_position = c(1,0,0),
                          target_position = c(0,0,0),
                          ...){
      # target position
      center_position <- (entry_position + target_position) / 2
      super$initialize(name, position = c(0, 0, 0), ...)

      # calculate matrix
      vec1 <- c(0, 1, 0)
      vec2 <- entry_position - target_position
      vec2_len <- norm(vec2, type = "2")
      vec2 <- vec2 / vec2_len

      theta <- acos(sum(vec1 * vec2))
      r <- c(
        vec1[2] * vec2[3] - vec1[3] * vec2[2],
        vec1[3] * vec2[1] - vec1[1] * vec2[3],
        vec1[1] * vec2[2] - vec1[2] * vec2[1]
      )

      K <- matrix(c(
        0, -r[3], r[2],
        r[3], 0, -r[1],
        -r[2], r[1], 0
      ), nrow = 3, byrow = TRUE)

      trans_mat <- (
        diag(1, nrow = 3, ncol = 3) + sin(theta) * K + (1 - cos(theta)) * (K %*% K)
      ) %*% diag(vec2_len, 3, 3)

      trans_mat <- rbind(cbind(trans_mat, c(center_position)), c(0, 0, 0, 1))
      self$trans_mat <- trans_mat

      dm <- dim(png::readPNG(image_path))
      self$aspect_ratio <- dm[[2]] / dm[[1]]
      self$image_uri <- dipsaus::to_datauri(file = image_path)
    },
    to_list = function(){
      c(
        super$to_list(),
        list(
          aspect_ratio = self$aspect_ratio,
          image_uri = self$image_uri
        )
      )
    }
  )
)
