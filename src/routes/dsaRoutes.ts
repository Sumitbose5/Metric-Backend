import { Router } from "express";
import { createProblem } from "../scripts/addProblem";
import { createTestCasesController } from "../controllers/testCase";
import { addProblemDataTypes } from "../scripts/addDataTypes";

const router = Router();

router.post("/add", createProblem);
router.post("/test-cases", createTestCasesController);
router.post("/data-types", addProblemDataTypes);

export default router;
