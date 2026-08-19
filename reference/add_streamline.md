# Add a streamline (fiber tract) bundle to a brain object

Registers a streamline file so it renders in the 3D viewer. The tract
data is not read in R; only the file path is recorded, and the viewer
loads and parses the file itself. Bundles are organized into circuit
groups so that several bundles contributing to the same brain circuit
can be toggled together.

## Usage

``` r
add_streamline(brain, name, color = NA)
```

## Arguments

- brain:

  a `'threeBrain'` brain object generated from
  [`threeBrain`](https://dipterix.org/threeBrain/reference/threeBrain.md)
  or
  [`merge_brain`](https://dipterix.org/threeBrain/reference/merge_brain.md)

- name:

  one or more streamline keys, of the form `'group/bundle'`. The bundle
  is the file name without extension and the group is the sub-folder
  under `'fs/streamline'`; both are matched case-insensitively, and the
  spelling on disk is the one kept. A key may also glob the bundle with
  `'*'` to select a whole circuit at once. See ‘Key syntax’ below

- color:

  line color, recycled over the bundles that `name` expands to; when
  `NA` (default) each bundle is colored from
  `'fs/streamline/colormap.csv'`, falling back to a color derived from
  the bundle name. See ‘Colors’

## Value

`add_streamline` returns the `brain` object, invisibly. The underlying
`brain$add_streamline` returns, invisibly, a named list of the bundles
it added, keyed by `'group/bundle'`

## Details

Files are searched with the following extension priority: `tck`, `trk`,
`trk.gz`, `tt`, `tt.gz`. `VTK` formats (`vtk`, `vtp`) are not supported
by the viewer. Naming such a file directly raises an error; when
expanding a wild card they are skipped, so one stray file cannot abort a
whole circuit. Streamline coordinates are assumed to be in scanner `RAS`
space, matching the convention used when tract files are dropped onto
the viewer.

## Key syntax

- `'motor/AF_left'`:

  one bundle, `'AF_left'`, in circuit `'motor'`

- `'motor/*'`:

  every bundle under `'fs/streamline/motor'`

- `'motor/'`:

  shorthand for `'motor/*'`

- `'motor/CST_*'`:

  bundles in `'motor'` whose name starts with `'CST_'`

- `'motor'`:

  no group prefix, hence `'default/motor'`: the file `'motor'` in the
  `'default'` circuit

- `'default/'`:

  the `'default'` circuit, which covers `'fs/streamline/default'` plus
  the files sitting directly in `'fs/streamline'`

`'*'` is only allowed in the bundle part; a wild card in the group part,
such as `'*/AF_left'`, raises an error so that a misspelled circuit name
fails loudly instead of quietly matching another circuit.

## Colors

A bundle takes the first color available from three sources:

1.  the `color` argument, when not `NA`;

2.  the optional table `'fs/streamline/colormap.csv'`, which uses the
    same format as the drag-and-drop color table, with a `'Filename'`
    and a `'Color'` column. A `'Filename'` entry may be `'group/name'`,
    `'name'`, or `'group/'` (the trailing slash marks a group-wide
    entry, which is how a whole circuit is painted one color); more
    specific entries win, and all comparisons ignore case and
    surrounding white spaces;

3.  otherwise a color derived from the bundle name itself, stable across
    sessions.

The derived color ignores case, punctuation and the file extension, and
folds left/right markers together, so `'CST_left.tck'`, `'CST-Right'`
and `'cst right.trk'` all render in the same color. A name whose last
six characters are hexadecimal digits spells out its own color, so a
bundle called `'CST_ff8800'` renders as `'#FF8800'`.

Every bundle declared this way is downloaded and parsed by the browser
when the viewer starts, so avoid declaring more bundles than needed.

## Examples

``` r

# Requires a FreeSurfer directory containing `streamline/motor/AF_left.trk`
if (FALSE) { # \dontrun{

brain <- threeBrain(path = "/path/to/fs", subject_code = "subject")

# circuit group is "motor", bundle name is "AF_left"
add_streamline(brain, "motor/AF_left", color = "#ff8800")

# the whole `motor` circuit, alternating two colors
add_streamline(brain, "motor/*", color = c("#ff8800", "#00ccff"))

# several keys at once; colors are recycled over the resulting bundles
add_streamline(brain, c("language/", "motor/CST_*"))

brain$streamline_types
brain$plot()

} # }
```
