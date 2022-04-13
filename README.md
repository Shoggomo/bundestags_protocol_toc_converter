# Bundestags protocol TOS converter

> **Note**: This script currently was only tested with the protocols of the 18. Wahlperiode.

This tool converts the table of contents of a Bundestags protocol PDF file in their new XML format.

All protocols, that are sure to work are already converted and provided in the `xml_output` folder.

The definition of the XML format can be
found [here](https://www.bundestag.de/resource/blob/577234/4c8091d8650fe417016bb48e604e3eaf/dbtplenarprotokoll_kommentiert-data.pdf)

# Prerequisites

Some prerequities before this script can be used:

- You need to have `node` and `npm` installed.
- All files can only contain the table of contents and white pages as output by
  the [Bundestags protocol splitting tool](https://github.com/Shoggomo/bundestags_protocol_splitter)
- All files need to have their original name. E.g. `18001.pdf`
- Split Stammdaten need to be generated. They are provided pre generated, so you should not need to do this.

# Configuration

This has some configuration options. The can be found in the`Config.ts` file. Some options, that can be adjusted are:

- Generate Stammdaten: Toggle to generate split Stammdaten datasets, or not.
    - As the Stammdaten are provided already split this should not be needed and can be left as `false`.
    - If this is turned to `true` the program won't convert files, but exit after the Stammdaten were generated.
    - This tool needs to split the main Stammdaten file into multiple smaller files, to work faster.
- Run asynchronous: Process files asynchronous. This can speed up the process, but console output is mixed up, so it's
  bad for debugging.
- Enable output: Output of XML files can be disabled for debugging.
- Output folder
- Skip pages: Skip some pages, when processing, useful for debugging.
- Skip files: Skip some files, useful for debugging.
- Only files: Only process given files, useful for debugging. When left empty, all files will be processed (except the
  ones being skipped).

# Usage

First install dependencies:

```bash
$ npm install
```

To run the script execute the following command, providing a Wahlperiode (e.g. 18) and the folder containing all
protocol TOSes:

```bash
$ npm run start -- <Wahlperiode> <PATH TO FOLDER WITH PROTOCOL TOSes>
```

Example:

```bash
$ npm run start -- 18 "/home/user1/protocols/tos"
```

# Problems and TODOs

This tool is not perfect yet, but gets a good baseline. Here are some things that can be improved.

- [ ] This tool was only tested with the protocols of the 18. Wahlperiode and probably needs tuning for other periods.
- [ ] Some entries have small formatting errors like split up words.
- [ ] Add `xref` Tag with Rede-ID (rid) (
  see [official documentation](https://www.bundestag.de/resource/blob/577234/4c8091d8650fe417016bb48e604e3eaf/dbtplenarprotokoll_kommentiert-data.pdf#G1030365))
- [ ] The `rolle` tags inside of `redner` tags are currently empty, because the needed information is not present in the
  Stammdaten
- [ ] Better check, if a person is meant as a Redner
    - Currently, a person is assumed as Redner, when their name appears in a TOS entry, but this can be false.
    - Here the Person *"Brigitte Zypries"* is not a Redner, but matched:
        - > Glückwünsche zum Geburtstag der Abgeordneten Brigitte Zypries
    - This is mostly a problem for "Mündliche Frage" entries
        - They normally contain a person asking a question and a person answering the question
- [ ] Handle when, multiple people have the same name
    - This should not happen too often, because the Stammdaten are split into election periods
    - When this happens, the first matching name from the Stammdaten is used
    - Currently, only the first and last name of a person is used to identify them. Maybe the `ortszusatz` can be used
      as well.
  