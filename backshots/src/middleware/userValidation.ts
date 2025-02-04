import { Request, Response, NextFunction, RequestHandler } from 'express';
import { ValidationChain, validationResult, body } from 'express-validator';

const validations: ValidationChain[] = [
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
  body('yearLevel').trim().notEmpty().withMessage('Year level is required'),
  body('age').isInt({ min: 17 }).withMessage('Age must be at least 17'),
  body('major').trim().notEmpty().withMessage('Major is required'),
  body('images').isArray().withMessage('Images must be an array'),
  body('aboutMe').trim().notEmpty().withMessage('About me is required'),
  body('yearlyGoal').trim().notEmpty().withMessage('Yearly goal is required'),
  body('potentialActivities').trim().notEmpty().withMessage('Potential activities is required'),
  body('favoriteMedia').trim().notEmpty().withMessage('Favorite media is required'),
  body('majorReason').trim().notEmpty().withMessage('Major reason is required'),
  body('studySpot').trim().notEmpty().withMessage('Study spot is required'),
  body('hobbies').trim().notEmpty().withMessage('Hobbies are required'),
  body('swipes').isArray().withMessage('Swipes must be an array'),
];

const validateResults: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ 
      success: false,
      errors: errors.array() 
    });
    return;
  }
  next();
};

// Explicitly cast the array as RequestHandler[]
export const validateUser = [...validations, validateResults] as RequestHandler[];