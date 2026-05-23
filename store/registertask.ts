// import * as TaskManager from "expo-task-manager";
// import * as BackgroundFetch from "expo-background-fetch";
// import { ParseIncomingSMS } from "@/services/smsHeadlessTask";

// const SMS_TASK = "sms-background-task";

// TaskManager.defineTask(SMS_TASK, async (item) => {
//   try {
//     console.log("[BG] Running SMS scan...");

//     await ParseIncomingSMS();

//     return BackgroundFetch.Result.NewData;
//   } catch (e) {
//     return BackgroundFetch.Result.Failed;
//   }
// });