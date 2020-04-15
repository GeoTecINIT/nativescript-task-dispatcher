/// <reference path="android-declarations.d.ts"/>

declare module es {
	export module uji {
		export module geotec {
			export module taskdispatcher {
				export class BootReceiver {
					public static class: java.lang.Class<es.uji.geotec.taskdispatcher.BootReceiver>;
					public constructor();
					public static setBootReceiverDelegate(param0: es.uji.geotec.taskdispatcher.BootReceiverDelegate): void;
					public onReceive(param0: globalAndroid.content.Context, param1: globalAndroid.content.Intent): void;
				}
			}
		}
	}
}

declare module es {
	export module uji {
		export module geotec {
			export module taskdispatcher {
				export class BootReceiverDelegate {
					public static class: java.lang.Class<es.uji.geotec.taskdispatcher.BootReceiverDelegate>;
					/**
					 * Constructs a new instance of the es.uji.geotec.taskdispatcher.BootReceiverDelegate interface with the provided implementation. An empty constructor exists calling super() when extending the interface class.
					 */
					public constructor(implementation: {
						onReceive(param0: globalAndroid.content.Context, param1: globalAndroid.content.Intent): void;
					});
					public constructor();
					public onReceive(param0: globalAndroid.content.Context, param1: globalAndroid.content.Intent): void;
				}
			}
		}
	}
}

declare module es {
	export module uji {
		export module geotec {
			export module taskdispatcher {
				export class BuildConfig {
					public static class: java.lang.Class<es.uji.geotec.taskdispatcher.BuildConfig>;
					public static DEBUG: boolean;
					public static LIBRARY_PACKAGE_NAME: string;
					public static APPLICATION_ID: string;
					public static BUILD_TYPE: string;
					public static FLAVOR: string;
					public static VERSION_CODE: number;
					public static VERSION_NAME: string;
					public constructor();
				}
			}
		}
	}
}

//Generics information:

