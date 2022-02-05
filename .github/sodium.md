# Sodium

[Sodium](https://github.com/paixaop/node-sodium) is an encryption package used to improve audio playback stability and performance. It's a dependency of Jukebot and recommended by the [Discord JS guide](https://discordjs.guide/voice/#extra-dependencies).

If you're getting errors on install they're likely due to Sodium, as it has some pre-requisites to build.

Here are some guides on fixing these errors, from personal experience.

## Windows

-   "msvsVersion is not defined"

    -   Make sure your have [Visual Studio 2015](https://my.visualstudio.com/Downloads?q=visual%20studio%202015&wt.mc_id=o~msft~vscom~older-downloads) installed, as (per the guide) it's the latest version Sodium supports.
        -   I used the **Visual Studio 2015 with Update 3** DVD ISO.
    -   Check your `msvsVersion` points to a valid install of Visual Studio (this one doesn't have to be 2015).

        -   <details>
            <summary>To check your config</summary>
            <br />

            ```sh
            # yarn
            yarn config get msvsVersion
            # npm
            npm config get msvsVersion

            ```

            </details>

        -   <details>
            <summary>Set Your Config</summary>
            <br />

            ```sh
            # yarn
            yarn config get msvsVersion

            # npm
            npm config get msvsVersion
            ```

-   "Failed to locate 'CL.exe'"

    -   From [this thread](https://stackoverflow.com/questions/33716369/error-trk0005-failed-to-locate-cl-exe), open your Visual Studio 2015 download and create a new **Visual C++ Project**.

-   Missing SDK 8.1

    -   Install the missing SDK from [here](https://developer.microsoft.com/en-us/windows/downloads/sdk-archive/).

-   Sodium's [Windows install guide](https://github.com/paixaop/node-sodium#windows-install)

## Linux

-   "libtool is required but wasn't found on this system"

    -   Install it ¯\\\_(ツ)\_/¯

    ```sh
    $ sudo apt install libtool
    ```

-   If you are getting errors in install, you likely need:

    -   make (`sudo apt install make`)
    -   build-essential (`sudo apt install build-essential`)

-   Sodium's [Linux install guide](https://github.com/paixaop/node-sodium#install).
