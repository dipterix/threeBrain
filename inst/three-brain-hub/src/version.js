// The bundle inlines package.json, so the shipped single file knows its version
import pkg from '../package.json' with { type: 'json' };

export const VERSION = pkg.version;
