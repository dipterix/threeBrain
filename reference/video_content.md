# Add video content to the viewer

Add video content to the viewer

## Usage

``` r
video_content(
  path,
  duration = Inf,
  time_start = 0,
  asp_ratio = 16/9,
  local = TRUE
)
```

## Arguments

- path:

  local file path or 'URL'

- duration:

  duration of the video

- time_start:

  start time relative to the stimuli onset

- asp_ratio:

  aspect ratio; default is `16/9`

- local:

  used only when `path` is a 'URL': whether to download the video before
  generating the viewer; see 'Details'

## Details

The video path can be either local file path or a 'URL' from websites.
When path is from the internet, there are two options: download the
video before generating the viewer, or directly use the 'URL'.

If download happens before a viewer is generated (`local=TRUE`), then
the video content is local. The viewer will be self-contained. However,
the distribution will contain the video, and the archive size might be
large.

If raw 'URL' is used (`local=FALSE`), then viewer is not self-contained
as the video link might break anytime. The 'screenshot' and 'record'
function might be limited if the 'URL' has different domain than yours.
However, the distribution will not contain the video, hence smaller.
This works in the scenarios when it is preferred not to share video
files or they are licensed, or simply distribution is limited. Besides,
this method is slightly faster than the local alternatives.
