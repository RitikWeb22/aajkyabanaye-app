import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Recipe } from '../types/recipe';

export interface ScaledIngredientPdfItem {
  name: string;
  formattedQuantity: string;
}

function escapeHtml(str: string): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function generateRecipeHtml(
  recipe: Recipe,
  currentServings: number,
  scaledIngredients: ScaledIngredientPdfItem[]
): string {
  const safeTitle = escapeHtml(recipe.title);
  const safeCuisine = escapeHtml(recipe.cuisine || '');
  const safeDiet = recipe.dietary.vegetarian ? 'Pure Vegetarian 🟢' : 'Non-Vegetarian 🔴';
  const cookTime = (recipe.cookTimeMins || 25) + (recipe.prepTimeMins || 10);
  const difficulty = (recipe.difficulty || 'easy').toUpperCase();

  const ingredientsListHtml = scaledIngredients
    .map(
      (ing) =>
        `<li><span class="ing-name">${escapeHtml(ing.name)}</span>: <span class="ing-qty">${escapeHtml(
          ing.formattedQuantity || ''
        )}</span></li>`
    )
    .join('\n');

  const stepsListHtml = (recipe.steps || [])
    .map((step) => `<li>${escapeHtml(step.text)}</li>`)
    .join('\n');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
        <title>${safeTitle}</title>
        <style>
          * { box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            padding: 32px 24px;
            color: #252923;
            background: #FFFFFF;
            line-height: 1.5;
          }
          .header {
            border-bottom: 3px solid #245C45;
            padding-bottom: 12px;
            margin-bottom: 20px;
          }
          h1 {
            color: #245C45;
            font-size: 26px;
            margin: 0 0 6px 0;
            font-weight: 700;
          }
          .tagline {
            color: #777D76;
            font-size: 13px;
            font-weight: 500;
          }
          .meta-bar {
            display: flex;
            background: #FFF9F0;
            padding: 12px 16px;
            border-radius: 12px;
            border: 1px solid #E8E5DC;
            margin-bottom: 24px;
          }
          .meta-item {
            margin-right: 24px;
            font-size: 13px;
            font-weight: 600;
            color: #245C45;
          }
          h2 {
            color: #245C45;
            font-size: 17px;
            border-bottom: 1.5px solid #72A67A;
            padding-bottom: 4px;
            margin-top: 24px;
            margin-bottom: 12px;
            font-weight: 700;
          }
          ul, ol {
            padding-left: 22px;
            margin: 0;
          }
          li {
            margin-bottom: 8px;
            font-size: 13.5px;
            color: #252923;
          }
          .ing-name {
            font-weight: 600;
            color: #245C45;
          }
          .ing-qty {
            font-weight: 500;
            color: #333333;
          }
          .footer {
            margin-top: 36px;
            font-size: 11px;
            color: #777D76;
            text-align: center;
            border-top: 1px solid #E8E5DC;
            padding-top: 14px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${safeTitle}</h1>
          <div class="tagline">${safeCuisine ? `${safeCuisine} Cuisine • ` : ''}${safeDiet} • AajKyaBanaye</div>
        </div>

        <div class="meta-bar">
          <span class="meta-item">⏱️ Total Time: ${cookTime}m</span>
          <span class="meta-item">👥 Servings: ${currentServings}</span>
          <span class="meta-item">🔥 Difficulty: ${difficulty}</span>
        </div>

        <h2>Ingredients (${currentServings} Servings)</h2>
        <ul>
          ${ingredientsListHtml}
        </ul>

        <h2>Cooking Instructions</h2>
        <ol>
          ${stepsListHtml}
        </ol>

        <div class="footer">
          Printed via <strong>AajKyaBanaye</strong> • "Aaj kya banega? Let's find out!"
        </div>
      </body>
    </html>
  `;
}

export async function exportRecipeToPdf(
  recipe: Recipe,
  currentServings: number,
  scaledIngredients: ScaledIngredientPdfItem[]
): Promise<void> {
  const html = generateRecipeHtml(recipe, currentServings, scaledIngredients);

  try {
    const isShareAvailable = await Sharing.isAvailableAsync().catch(() => false);

    if (isShareAvailable) {
      // Create local PDF file and open share sheet
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, {
        UTI: '.pdf',
        mimeType: 'application/pdf',
        dialogTitle: `Share or Save ${recipe.title} PDF`,
      });
      return;
    }
  } catch (shareErr) {
    console.warn('Sharing PDF file failed, falling back to system Print / Save as PDF:', shareErr);
  }

  // Direct native system Print Spooler (supports native "Save as PDF" option on Android & iOS)
  await Print.printAsync({ html });
}
