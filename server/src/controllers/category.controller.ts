import { Request, Response, NextFunction } from 'express';
import { Category } from '../models/Category.model';
import { Product } from '../models/Product.model';

interface AuthRequest extends Request {
  user?: {
    userId: string;
    username: string;
    email: string;
    role: string;
  };
}

export class CategoryController {
  // List all categories
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { includeInactive = 'false' } = req.query as Record<string, string>;
      const filters = includeInactive === 'true' ? {} : { isActive: true };
      
      const items = await Category.find(filters)
        .select('name description color parent level sortOrder isActive createdAt updatedAt')
        .sort({ sortOrder: 1, 'name.en': 1 });

      // Calculate product count for each category
      const categoriesWithCount = await Promise.all(
        items.map(async (category) => {
          const productCount = await Product.countDocuments({ 
            category: category._id, 
            isActive: true 
          });
          return {
            ...category.toObject(),
            productCount
          };
        })
      );

  return res.json({ success: true, data: { items: categoriesWithCount } });
    } catch (err) {
  return next(err);
    }
  }

  // Get single category by ID
  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const category = await Category.findById(id);
      
      if (!category) {
        return res.status(404).json({ success: false, message: 'Category not found' });
      }

      // Get product count
      const productCount = await Product.countDocuments({ 
        category: id, 
        isActive: true 
      });

  return res.json({ 
        success: true, 
        data: { 
          category: {
            ...category.toObject(),
            productCount
          }
        }
      });
    } catch (err) {
  return next(err);
    }
  }

  // Create new category
  static async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { name, description, color, parent, sortOrder } = req.body;

      // Check if category name already exists
      const existingCategory = await Category.findOne({
        $or: [
          { 'name.en': name.en },
          { 'name.si': name.si }
        ]
      });

      if (existingCategory) {
        return res.status(400).json({
          success: false,
          message: 'Category with this name already exists'
        });
      }

      // Determine level based on parent
      let level = 1;
      if (parent) {
        const parentCategory = await Category.findById(parent);
        if (!parentCategory) {
          return res.status(400).json({
            success: false,
            message: 'Parent category not found'
          });
        }
        level = parentCategory.level + 1;
      }

      const category = new Category({
        name,
        description: description || { en: '', si: '' },
        color,
        parent,
        level,
        sortOrder: sortOrder || 0,
        isActive: true
      });

      await category.save();

  return res.status(201).json({
        success: true,
        message: 'Category created successfully',
        data: { category }
      });
    } catch (err) {
  return next(err);
    }
  }

  // Update category
  static async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // Remove fields that shouldn't be updated directly
      delete updateData._id;
      delete updateData.__v;

      // Check if updating name conflicts with existing category
      if (updateData.name) {
        const existingCategory = await Category.findOne({
          _id: { $ne: id },
          $or: [
            { 'name.en': updateData.name.en },
            { 'name.si': updateData.name.si }
          ]
        });

        if (existingCategory) {
          return res.status(400).json({
            success: false,
            message: 'Another category with this name already exists'
          });
        }
      }

      // Update level if parent changes
      if (updateData.parent !== undefined) {
        if (updateData.parent) {
          const parentCategory = await Category.findById(updateData.parent);
          if (!parentCategory) {
            return res.status(400).json({
              success: false,
              message: 'Parent category not found'
            });
          }
          updateData.level = parentCategory.level + 1;
        } else {
          updateData.level = 1;
        }
      }

      const category = await Category.findByIdAndUpdate(
        id,
        { ...updateData, updatedAt: new Date() },
        { new: true, runValidators: true }
      );

      if (!category) {
        return res.status(404).json({ success: false, message: 'Category not found' });
      }

  return res.json({
        success: true,
        message: 'Category updated successfully',
        data: { category }
      });
    } catch (err) {
  return next(err);
    }
  }

  // Delete category (soft delete)
  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      // Check if category has products
      const productCount = await Product.countDocuments({ category: id, isActive: true });
      if (productCount > 0) {
        return res.status(400).json({
          success: false,
          message: `Cannot delete category. It has ${productCount} active product(s).`
        });
      }

      // Check if category has child categories
      const childCategories = await Category.countDocuments({ parent: id, isActive: true });
      if (childCategories > 0) {
        return res.status(400).json({
          success: false,
          message: `Cannot delete category. It has ${childCategories} child categorie(s).`
        });
      }

      const category = await Category.findByIdAndUpdate(
        id,
        { isActive: false, updatedAt: new Date() },
        { new: true }
      );

      if (!category) {
        return res.status(404).json({ success: false, message: 'Category not found' });
      }

    return res.json({
        success: true,
        message: 'Category deleted successfully',
        data: { category }
      });
    } catch (err) {
    return next(err);
    }
  }

  // Get category statistics
  static async getStats(_req: Request, res: Response, next: NextFunction) {
    try {
      const [
        totalCategories,
        activeCategories,
        categoriesWithProducts
      ] = await Promise.all([
        Category.countDocuments(),
        Category.countDocuments({ isActive: true }),
        Category.aggregate([
          { $match: { isActive: true } },
          {
            $lookup: {
              from: 'products',
              localField: '_id',
              foreignField: 'category',
              as: 'products',
              pipeline: [{ $match: { isActive: true } }]
            }
          },
          {
            $addFields: {
              productCount: { $size: '$products' }
            }
          },
          {
            $match: {
              productCount: { $gt: 0 }
            }
          },
          {
            $count: 'count'
          }
        ])
      ]);

  return res.json({
        success: true,
        data: {
          totalCategories,
          activeCategories,
          inactiveCategories: totalCategories - activeCategories,
          categoriesWithProducts: categoriesWithProducts[0]?.count || 0,
          emptyCategoriesCount: activeCategories - (categoriesWithProducts[0]?.count || 0)
        }
      });
    } catch (err) {
  return next(err);
    }
  }
}


