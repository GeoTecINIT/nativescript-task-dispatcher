/// <reference path="android-declarations.d.ts"/>

declare namespace es {
  export namespace uji {
    export namespace geotec {
      export namespace taskdispatcher {
        export class BootReceiver {
          public static class: java.lang.Class<
            es.uji.geotec.taskdispatcher.BootReceiver
          >;
          public constructor();
          public static setBootReceiverDelegate(
            param0: es.uji.geotec.taskdispatcher.BootReceiverDelegate
          ): void;
          public onReceive(
            param0: globalAndroid.content.Context,
            param1: globalAndroid.content.Intent
          ): void;
        }
      }
    }
  }
}

declare namespace es {
  export namespace uji {
    export namespace geotec {
      export namespace taskdispatcher {
        export class BootReceiverDelegate extends es.uji.geotec.taskdispatcher
          .common.BroadcastReceiverDelegate {
          public static class: java.lang.Class<
            es.uji.geotec.taskdispatcher.BootReceiverDelegate
          >;
          /**
           * Constructs a new instance of the es.uji.geotec.taskdispatcher.BootReceiverDelegate interface with the provided implementation. An empty constructor exists calling super() when extending the interface class.
           */
          public constructor(implementation: {
            onReceive(
              param0: globalAndroid.content.Context,
              param1: globalAndroid.content.Intent
            ): void;
          });
          public constructor();
          public onReceive(
            param0: globalAndroid.content.Context,
            param1: globalAndroid.content.Intent
          ): void;
        }
      }
    }
  }
}

declare namespace es {
  export namespace uji {
    export namespace geotec {
      export namespace taskdispatcher {
        export class BuildConfig {
          public static class: java.lang.Class<
            es.uji.geotec.taskdispatcher.BuildConfig
          >;
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

declare namespace es {
  export namespace uji {
    export namespace geotec {
      export namespace taskdispatcher {
        export namespace alarms {
          export class AlarmReceiver {
            public static class: java.lang.Class<
              es.uji.geotec.taskdispatcher.alarms.AlarmReceiver
            >;
            public onReceive(
              param0: globalAndroid.content.Context,
              param1: globalAndroid.content.Intent
            ): void;
            public constructor();
            public static setAlarmReceiverDelegate(
              param0: es.uji.geotec.taskdispatcher.alarms.AlarmReceiverDelegate
            ): void;
          }
        }
      }
    }
  }
}

declare namespace es {
  export namespace uji {
    export namespace geotec {
      export namespace taskdispatcher {
        export namespace alarms {
          export class AlarmReceiverDelegate extends es.uji.geotec
            .taskdispatcher.common.BroadcastReceiverDelegate {
            public static class: java.lang.Class<
              es.uji.geotec.taskdispatcher.alarms.AlarmReceiverDelegate
            >;
            /**
             * Constructs a new instance of the es.uji.geotec.taskdispatcher.alarms.AlarmReceiverDelegate interface with the provided implementation. An empty constructor exists calling super() when extending the interface class.
             */
            public constructor(implementation: {
              onReceive(
                param0: globalAndroid.content.Context,
                param1: globalAndroid.content.Intent
              ): void;
            });
            public constructor();
            public onReceive(
              param0: globalAndroid.content.Context,
              param1: globalAndroid.content.Intent
            ): void;
          }
        }
      }
    }
  }
}

declare namespace es {
  export namespace uji {
    export namespace geotec {
      export namespace taskdispatcher {
        export namespace alarms {
          export class AlarmRunnerService {
            public static class: java.lang.Class<
              es.uji.geotec.taskdispatcher.alarms.AlarmRunnerService
            >;
            public static setAlarmRunnerServiceDelegate(
              param0: es.uji.geotec.taskdispatcher.alarms.AlarmRunnerServiceDelegate
            ): void;
            public constructor();
            public onDestroy(): void;
            public onCreate(): void;
            public onBind(
              param0: globalAndroid.content.Intent
            ): globalAndroid.os.IBinder;
            public onStartCommand(
              param0: globalAndroid.content.Intent,
              param1: number,
              param2: number
            ): number;
          }
        }
      }
    }
  }
}

declare namespace es {
  export namespace uji {
    export namespace geotec {
      export namespace taskdispatcher {
        export namespace alarms {
          export class AlarmRunnerServiceDelegate extends es.uji.geotec
            .taskdispatcher.common.ServiceDelegate {
            public static class: java.lang.Class<
              es.uji.geotec.taskdispatcher.alarms.AlarmRunnerServiceDelegate
            >;
            /**
             * Constructs a new instance of the es.uji.geotec.taskdispatcher.alarms.AlarmRunnerServiceDelegate interface with the provided implementation. An empty constructor exists calling super() when extending the interface class.
             */
            public constructor(implementation: {
              onCreate(param0: globalAndroid.app.Service): void;
              onStartCommand(
                param0: globalAndroid.content.Intent,
                param1: number,
                param2: number
              ): number;
              onDestroy(): void;
            });
            public constructor();
            public onDestroy(): void;
            public onCreate(param0: globalAndroid.app.Service): void;
            public onStartCommand(
              param0: globalAndroid.content.Intent,
              param1: number,
              param2: number
            ): number;
          }
        }
      }
    }
  }
}

declare namespace es {
  export namespace uji {
    export namespace geotec {
      export namespace taskdispatcher {
        export namespace alarms {
          export class WatchdogReceiver {
            public static class: java.lang.Class<
              es.uji.geotec.taskdispatcher.alarms.WatchdogReceiver
            >;
            public onReceive(
              param0: globalAndroid.content.Context,
              param1: globalAndroid.content.Intent
            ): void;
            public constructor();
            public static setWatchdogReceiverDelegate(
              param0: es.uji.geotec.taskdispatcher.alarms.WatchdogReceiverDelegate
            ): void;
          }
        }
      }
    }
  }
}

declare namespace es {
  export namespace uji {
    export namespace geotec {
      export namespace taskdispatcher {
        export namespace alarms {
          export class WatchdogReceiverDelegate extends es.uji.geotec
            .taskdispatcher.common.BroadcastReceiverDelegate {
            public static class: java.lang.Class<
              es.uji.geotec.taskdispatcher.alarms.WatchdogReceiverDelegate
            >;
            /**
             * Constructs a new instance of the es.uji.geotec.taskdispatcher.alarms.WatchdogReceiverDelegate interface with the provided implementation. An empty constructor exists calling super() when extending the interface class.
             */
            public constructor(implementation: {
              onReceive(
                param0: globalAndroid.content.Context,
                param1: globalAndroid.content.Intent
              ): void;
            });
            public constructor();
            public onReceive(
              param0: globalAndroid.content.Context,
              param1: globalAndroid.content.Intent
            ): void;
          }
        }
      }
    }
  }
}

declare namespace es {
  export namespace uji {
    export namespace geotec {
      export namespace taskdispatcher {
        export namespace common {
          export class BroadcastReceiverDelegate {
            public static class: java.lang.Class<
              es.uji.geotec.taskdispatcher.common.BroadcastReceiverDelegate
            >;
            /**
             * Constructs a new instance of the es.uji.geotec.taskdispatcher.common.BroadcastReceiverDelegate interface with the provided implementation. An empty constructor exists calling super() when extending the interface class.
             */
            public constructor(implementation: {
              onReceive(
                param0: globalAndroid.content.Context,
                param1: globalAndroid.content.Intent
              ): void;
            });
            public constructor();
            public onReceive(
              param0: globalAndroid.content.Context,
              param1: globalAndroid.content.Intent
            ): void;
          }
        }
      }
    }
  }
}

declare namespace es {
  export namespace uji {
    export namespace geotec {
      export namespace taskdispatcher {
        export namespace common {
          export class ReceiverActivationCache {
            public static class: java.lang.Class<
              es.uji.geotec.taskdispatcher.common.ReceiverActivationCache
            >;
            public constructor(
              param0: globalAndroid.content.Context,
              param1: globalAndroid.content.Intent
            );
            public getContext(): globalAndroid.content.Context;
            public getIntent(): globalAndroid.content.Intent;
          }
        }
      }
    }
  }
}

declare namespace es {
  export namespace uji {
    export namespace geotec {
      export namespace taskdispatcher {
        export namespace common {
          export class ServiceActivationCache {
            public static class: java.lang.Class<
              es.uji.geotec.taskdispatcher.common.ServiceActivationCache
            >;
            public constructor();
            public onStartCommandWasEarlyCalled(): boolean;
            public onStartCommandEarlyCalledHandled(): void;
            public onCreateWasEarlyCalled(): boolean;
            public getStartFlags(): number;
            public onCreateEarlyCalled(param0: globalAndroid.app.Service): void;
            public getStartIntent(): globalAndroid.content.Intent;
            public onCreateEarlyCalledHandled(): void;
            public onStartCommandEarlyCalled(
              param0: globalAndroid.content.Intent,
              param1: number,
              param2: number
            ): void;
            public getService(): globalAndroid.app.Service;
            public getStartId(): number;
          }
        }
      }
    }
  }
}

declare namespace es {
  export namespace uji {
    export namespace geotec {
      export namespace taskdispatcher {
        export namespace common {
          export class ServiceDelegate {
            public static class: java.lang.Class<
              es.uji.geotec.taskdispatcher.common.ServiceDelegate
            >;
            /**
             * Constructs a new instance of the es.uji.geotec.taskdispatcher.common.ServiceDelegate interface with the provided implementation. An empty constructor exists calling super() when extending the interface class.
             */
            public constructor(implementation: {
              onCreate(param0: globalAndroid.app.Service): void;
              onStartCommand(
                param0: globalAndroid.content.Intent,
                param1: number,
                param2: number
              ): number;
              onDestroy(): void;
            });
            public constructor();
            public onDestroy(): void;
            public onCreate(param0: globalAndroid.app.Service): void;
            public onStartCommand(
              param0: globalAndroid.content.Intent,
              param1: number,
              param2: number
            ): number;
          }
        }
      }
    }
  }
}

declare namespace es {
  export namespace uji {
    export namespace geotec {
      export namespace taskdispatcher {
        export namespace runners {
          export class TaskChainRunnerService {
            public static class: java.lang.Class<
              es.uji.geotec.taskdispatcher.runners.TaskChainRunnerService
            >;
            public constructor();
            public onDestroy(): void;
            public onCreate(): void;
            public onBind(
              param0: globalAndroid.content.Intent
            ): globalAndroid.os.IBinder;
            public static setTaskChainRunnerServiceDelegate(
              param0: es.uji.geotec.taskdispatcher.runners.TaskChainRunnerServiceDelegate
            ): void;
            public onStartCommand(
              param0: globalAndroid.content.Intent,
              param1: number,
              param2: number
            ): number;
          }
        }
      }
    }
  }
}

declare namespace es {
  export namespace uji {
    export namespace geotec {
      export namespace taskdispatcher {
        export namespace runners {
          export class TaskChainRunnerServiceDelegate extends es.uji.geotec
            .taskdispatcher.common.ServiceDelegate {
            public static class: java.lang.Class<
              es.uji.geotec.taskdispatcher.runners.TaskChainRunnerServiceDelegate
            >;
            /**
             * Constructs a new instance of the es.uji.geotec.taskdispatcher.runners.TaskChainRunnerServiceDelegate interface with the provided implementation. An empty constructor exists calling super() when extending the interface class.
             */
            public constructor(implementation: {
              onCreate(param0: globalAndroid.app.Service): void;
              onStartCommand(
                param0: globalAndroid.content.Intent,
                param1: number,
                param2: number
              ): number;
              onDestroy(): void;
            });
            public constructor();
            public onDestroy(): void;
            public onCreate(param0: globalAndroid.app.Service): void;
            public onStartCommand(
              param0: globalAndroid.content.Intent,
              param1: number,
              param2: number
            ): number;
          }
        }
      }
    }
  }
}

// Generics information:
