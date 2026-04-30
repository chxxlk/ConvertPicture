import { Queue } from "bullmq";
import { connection } from "./connection";

export const imageQueue = new Queue("image-conversion", {
  connection,
});
