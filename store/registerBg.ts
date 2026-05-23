// export async function registerBackgroundSMS() {
//   const status = await BackgroundFetch.getStatusAsync();

//   if (status !== BackgroundFetch.Status.Available) {
//     console.log("Background fetch not available");
//     return;
//   }

//   await BackgroundFetch.registerTaskAsync(SMS_TASK, {
//     minimumInterval: 15 * 60, // 15 min
//     stopOnTerminate: false,
//     startOnBoot: true,
//   });

//   console.log("Background SMS task registered");
// }