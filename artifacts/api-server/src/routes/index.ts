import { Router, type IRouter } from "express";
import healthRouter from "./health";
import jihamiProxyRouter from "./jihami-proxy";

const router: IRouter = Router();

router.use(healthRouter);
router.use(jihamiProxyRouter);

export default router;
