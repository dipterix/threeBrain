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

  one or more streamline keys, of the form `'circuit/bundle'`. The
  circuit is the top-level sub-folder under `'fs/streamline'` and the
  bundle is the file name without extension, prefixed by any further
  sub-folders it sits in; both are matched case-insensitively, and the
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
it added, keyed by `'circuit/bundle'`. That same key names the bundle's
visibility controller in the viewer, as `'Show: circuit/bundle'`

## Details

Files are searched with the following extension priority: `tck`, `trk`,
`trk.gz`, `tt`, `tt.gz`. `VTK` formats (`vtk`, `vtp`) are not supported
by the viewer. Naming such a file directly raises an error; when
expanding a wild card they are skipped, so one stray file cannot abort a
whole circuit. Streamline coordinates are assumed to be in scanner `RAS`
space, matching the convention used when tract files are dropped onto
the viewer.

## Key syntax

A key names exactly one circuit, and the circuit is always the **first**
component: everything after it is the bundle, so `'motor/left/AF'` is
the bundle `'left/AF'` of circuit `'motor'`, not a circuit called
`'motor/left'`. Sub-folders are therefore a way to load part of a
circuit, not a way to create more of them, and all of `'motor'` shares
one folder in the viewer's control panel.

- `'motor/AF_left'`:

  one bundle, `'AF_left'`, in circuit `'motor'`

- `'motor/*'`:

  every bundle in circuit `'motor'`, including those in its sub-folders

- `'motor/'`:

  shorthand for `'motor/*'`

- `'motor/left/AF'`:

  one bundle stored as `'fs/streamline/motor/left/AF.tck'`, known as
  `'left/AF'` within circuit `'motor'`

- `'motor/left/*'`:

  only the `'left'` sub-folder of circuit `'motor'`, rather than the
  whole circuit

- `'motor/CST_*'`:

  bundles in `'motor'` whose name starts with `'CST_'`

- `'motor'`:

  no circuit prefix, hence `'default/motor'`: the file `'motor'` in the
  `'default'` circuit

- `'default/'`:

  the `'default'` circuit, which covers `'fs/streamline/default'` plus
  the files sitting directly in `'fs/streamline'` – but not the other
  circuits' folders

`'*'` matches `'/'` as well, which is why `'motor/*'` reaches into
sub-folders. It is only allowed in the last component, though: a wild
card in a folder name, such as `'*/AF_left'` or `'motor/*/AF_left'`,
raises an error so that a misspelled circuit or sub-folder fails loudly
instead of quietly matching another one.

## Colors

A bundle takes the first color available from three sources:

1.  the `color` argument, when not `NA`;

2.  the optional table `'fs/streamline/colormap.csv'`, which uses the
    same format as the drag-and-drop color table, with a `'Filename'`
    and a `'Color'` column. A `'Filename'` entry may be
    `'circuit/bundle'`, `'bundle'`, the bundle's bare file name (for a
    bundle stored in a sub-folder), or `'circuit/'` (the trailing slash
    marks a circuit-wide entry, which is how a whole circuit is painted
    one color); more specific entries win, and all comparisons ignore
    case and surrounding white spaces;

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

# circuit is "motor", bundle name is "AF_left"
add_streamline(brain, "motor/AF_left", color = "#ff8800")

# the whole `motor` circuit, alternating two colors
add_streamline(brain, "motor/*", color = c("#ff8800", "#00ccff"))

# only the `left` sub-folder of the same circuit
add_streamline(brain, "motor/left/*")

# several keys at once; colors are recycled over the resulting bundles
add_streamline(brain, c("language/", "motor/CST_*"))

# bundle keys double as controller names
brain$plot(controllers = list("Show: motor/left/AF" = FALSE))

brain$streamline_types
brain$plot()

} # }
```
