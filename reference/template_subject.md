# Download and Manage Template Subjects

Download and Manage Template Subjects

## Usage

``` r
download_template_subject(
  subject_code = "N27",
  url,
  template_dir = default_template_directory()
)

download_N27(make_default = FALSE, ...)

set_default_template(
  subject_code,
  view = TRUE,
  template_dir = default_template_directory()
)

threebrain_finalize_installation(
  upgrade = c("ask", "always", "never", "data-only", "config-only"),
  async = TRUE
)

available_templates()
```

## Arguments

- subject_code:

  character with only letters and numbers (Important); default is
  \`N27\`

- url:

  zip file address; must be specified if `subject_code` is not from the
  followings: `'bert'`, `'cvs_avg35'`, `'cvs_avg35_inMNI152'`,
  `'fsaverage'`, `'fsaverage_sym'`, or `'N27'`

- template_dir:

  parent directory where subject's \`FreeSurfer\` folder should be
  stored

- make_default:

  logical, whether to make \`N27\` default subject

- ...:

  more to pass to `download_template_subject`

- view:

  whether to view the subject

- upgrade:

  whether to check and download 'N27' brain interactively. Choices are
  'ask', 'always', and 'never'

- async:

  whether to run the job in parallel to others; default is true

## Details

To view electrodes implanted in multiple subjects, it's highly
recommended to view them in a template space The detail mapping method
is discussed in function `threeBrain`.

To map to a template space, one idea is to find someone whose brain is
normal. In our case, the choice is subject \`N27\`, also known as
\`Colin 27\`. function `download_N27` provides a simple and easy way to
download a partial version from the Internet.

If you have any other ideas about template brain, you can use function
`set_default_template(subject_code, template_dir)` to redirect to your
choice. If your template brain is a \`Zip\` file on the Internet, we
provide function `download_template_subject` to automatically install
it.

## Author

Zhengjia Wang
