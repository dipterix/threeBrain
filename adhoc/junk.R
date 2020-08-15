p=10
a = array(0.6, c(p,p))
diag(a) = 1
eigen(a)

make_sigma = function(r1, r2, p, block1 = 0, offsets = NULL){
  if( block1 == 0 ){
    r = array(c(r1, r2)[rbinom(p*p, prob = 0.5, size = 1) + 1], c(p,p));
    r = r * upper.tri(r) ; r = t(r) + r; diag(r) = 1
  }else{
    r = array(r2, c(p,p))
    r[1:block1, 1:block1] = rep(r1, block1 * block1)
    if( is.null(offsets) ){
      offsets = array(c(r1, r2)[rbinom((p-block1) * block1, prob = 0.5, size = 1) + 1], c(block1,p-block1));
    }else{
      dim(offsets) = c(block1,p-block1)
    }
    r[1:block1, block1 + (1:(p-block1))] = offsets
    r[block1 + (1:(p-block1)), 1:block1] = t(offsets)
    diag(r) = 1
  }
  r
}


r1 = 0.9; r2 = 0.1
re = sapply((-10:10)/10, function(r1){
  sapply((-10:10)/10, function(r2){
    print(c(r1,r2))
    valid = replicate(1000, {
      r = make_sigma(r1, r2, p)
      min(eigen(r)$val) >= 0
    })
    sum(valid) / 1000
  })
})

fields::image.plot(x=(-10:10)/10,y=(-10:10)/10,z=re, xlab = 'rho1', ylab = 'rho2', main = 'Valid Sigmas (Percentage)')


rhos = c(0.8,0.9)

re2 = sapply((-10:10)/10, function(r1){
  sapply((-10:10)/10, function(r2){
    rhos = c(r1,r2)
    print(rhos)
    eigens = replicate(1000, {
      r1 = make_sigma(rhos[1], rhos[2], p, 5)
      r2 = make_sigma(rhos[1], rhos[2], p, 5, rep(runif(1, min = min(rhos), max = max(rhos)), 5*5))
      # c(min(eigen(r1)$val), min(eigen(r2)$val))
      min(eigen(r1)$val)
    })
    mean(eigens[eigens > 0])
  })
})

fields::image.plot(x=(1:10)/10,y=(1:10)/10,z=re2, xlab = 'rho1', ylab = 'rho2')
