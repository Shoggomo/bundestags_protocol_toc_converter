/**
 * Generate Stammdaten. This needs to be done, if there are no Stammdaten files in the stammdaten_by_wp folder.
 * After they are generated the script will exit. then you need to set this to false again.
 */
export const GENERATE_STAMMDATEN = false;

/**
 * Process files asynchronous. This can speed up the process, but console output is mixed up, so it's bad for debugging.
 */
export const RUN_ASYNCHRONOUS = true;

/**
 * Enable the output XML files?
 */
export const ENABLE_OUTPUT = true;

/**
 * The folder, the XML files will be saved.
 */
export const OUTPUT_FOLDER_PATH = String.raw`./xml_output/`;

/**
 * Skip the first X pages. Useful for debugging an error on a certain page.
 */
export const SKIP_PAGES = 0;

/**
 * Skip these files.
 */
export const SKIP_FILES: string[] = [
    // "18001.pdf", //Redo this, after special fix (page numbers are in last segment)
];

/**
 * Only process these files. If empty every file will be processed. This is useful for debugging.
 */
export const ONLY_FILES: string[] = [
    // "18001.pdf", // Redo this, after special fix (page numbers are in last segment)
    // "18088.pdf", //Redo this, DONE
    // "18022.pdf", Redo this

    // "18116.pdf",
    //
    // "18119.pdf",
    // "18120.pdf",
    // "18121.pdf",
    // "18122.pdf",
    // "18123.pdf",
    // "18124.pdf",
    // "18125.pdf",
    // "18126.pdf",
    // "18127.pdf",
    // "18128.pdf",
    // "18129.pdf",
    //
    // "18131.pdf",
    // "18132.pdf",
    // "18133.pdf",
    // "18134.pdf",
    // "18135.pdf",
    //
    // "18137.pdf",
    // "18138.pdf",
    // "18139.pdf",
    // "18140.pdf",
    //
    // "18142.pdf",
    // "18143.pdf",
    // "18144.pdf",
    // "18145.pdf",
    // "18146.pdf",
    // "18147.pdf",
    // "18148.pdf",
    //
    // "18150.pdf",
    // "18151.pdf",
    // "18152.pdf",
    // "18153.pdf",
    //
    // "18155.pdf",
    // "18156.pdf",
    //
    // "18158.pdf",
    // "18159.pdf",
    //
    // "18161.pdf",
    // "18162.pdf",
    // "18163.pdf",
    //
    // "18165.pdf",
    // "18166.pdf",
    // "18167.pdf",
    // "18168.pdf",
    // "18169.pdf",
    // "18170.pdf",
    // "18171.pdf",
    // "18172.pdf",
    // "18173.pdf",
    // "18174.pdf",
    // "18175.pdf",
    // "18176.pdf",
    // "18177.pdf",
    // "18178.pdf",
    // "18179.pdf",
    // "18180.pdf",
    //
    // "18182.pdf",
    // "18183.pdf",
    // "18184.pdf",
    // "18185.pdf",
    // "18186.pdf",
    // "18187.pdf",
    // "18188.pdf",
    // "18189.pdf",
    // "18190.pdf",
    // "18191.pdf",
    // "18192.pdf",
    //
    // "18194.pdf",
    // "18195.pdf",
    // "18196.pdf",
    // "18197.pdf",
    // "18198.pdf",
    // "18199.pdf", // working file for comparison
    //
    // "18201.pdf",
    // "18202.pdf",
    // "18203.pdf",
    // "18204.pdf",
    // "18205.pdf",
    // "18206.pdf",
    // "18207.pdf",
    //
    // "18209.pdf",
    // "18210.pdf",
    // "18211.pdf",
    // "18212.pdf",
    // "18213.pdf",
    // "18214.pdf",
    // "18215.pdf",
    // "18216.pdf",
    // "18217.pdf",
    // "18218.pdf",
    // "18219.pdf",
    // "18220.pdf",
    // "18221.pdf",
    // "18222.pdf",
    // "18223.pdf",
    // "18224.pdf",
    // "18225.pdf",
    // "18226.pdf",
    // "18227.pdf",
    // "18228.pdf",
    // "18229.pdf",
    // "18230.pdf",
    // "18231.pdf",
    // "18232.pdf",
    //
    // "18234.pdf",
    // "18235.pdf",
    // "18236.pdf",
    // "18237.pdf",
    // "18238.pdf",
    // "18239.pdf",
    //
    // "18241.pdf",
    // "18242.pdf",
    // "18243.pdf",
    // "18244.pdf",

    // After white page bug

    // "18003.pdf",
    // "18004.pdf",
    // "18006.pdf",
    // "18007.pdf",
    // "18010.pdf",
    // "18011.pdf",
    // "18013.pdf",
    // "18014.pdf",
    // "18017.pdf",
    // "18018.pdf",
    // "18019.pdf",
    // "18022.pdf",
    // "18023.pdf",
    // "18025.pdf",
    // "18026.pdf",
    // "18029.pdf",
    // "18033.pdf",
    // "18037.pdf",
    // "18039.pdf",
    // "18041.pdf",
    // "18042.pdf",
    // "18043.pdf",
    // "18044.pdf",
    // "18045.pdf",
    // "18046.pdf",
    // "18047.pdf",
    // "18052.pdf",
    // "18056.pdf",
    // "18057.pdf",
    // "18060.pdf",
    // "18061.pdf",
    // "18063.pdf",
    // "18064.pdf",
    // "18066.pdf",
    // "18067.pdf",
    // "18070.pdf",
    // "18072.pdf",
    // "18078.pdf",
    // "18079.pdf",
    // "18080.pdf",
    // "18081.pdf",
    // "18082.pdf",
    // "18083.pdf",
    // "18088.pdf",
    // "18089.pdf",
    // "18091.pdf",
    // "18092.pdf",
    // "18093.pdf",
    // "18094.pdf",
    // "18097.pdf",
    // "18099.pdf",
    // "18100.pdf",
    // "18101.pdf",
    // "18102.pdf",
    // "18103.pdf",
    // "18105.pdf",
    // "18107.pdf",
    // "18109.pdf",
    // "18111.pdf",
    // "18113.pdf",
    // "18114.pdf",
    // "18115.pdf",
    // "18121.pdf",
    // "18123.pdf",
    // "18124.pdf",
    // "18125.pdf",
    // "18127.pdf",
    // "18130.pdf",
    // "18131.pdf",
    // "18132.pdf",
    // "18137.pdf",
    // "18140.pdf",
    // "18142.pdf",
    // "18144.pdf",
    // "18145.pdf",
    // "18146.pdf",
    // "18152.pdf",
    // "18153.pdf",
    // "18154.pdf",
    // "18155.pdf",
    // "18159.pdf",
    // "18160.pdf",
    // "18161.pdf",
    // "18165.pdf",
    // "18167.pdf",
    // "18168.pdf",
    // "18169.pdf",
    // "18170.pdf",
    // "18171.pdf",
    // "18176.pdf",
    // "18178.pdf",
    // "18181.pdf",
    // "18182.pdf",
    // "18184.pdf",
    // "18187.pdf",
    // "18189.pdf",
    // "18190.pdf",
    // "18192.pdf",
    // "18196.pdf",
    // "18197.pdf",
    // "18203.pdf",
    // "18206.pdf",
    // "18207.pdf",
    // "18210.pdf",
    // "18212.pdf",
    // "18214.pdf",
    // "18215.pdf",
    // "18217.pdf",
    // "18218.pdf",
    // "18230.pdf",
    // "18231.pdf",
    // "18232.pdf",
    // "18233.pdf",
    // "18234.pdf",
    // "18236.pdf",
    // "18237.pdf",
    // "18241.pdf",
    // "18242.pdf",
    // "18243.pdf",
    // "18244.pdf",
    
];
