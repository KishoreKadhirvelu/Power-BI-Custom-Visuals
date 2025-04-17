# Power BI Custom Visual: Bar & Line Chart with Table

This custom visual for Power BI combines a bar and line chart with an integrated table, providing a comprehensive view of your data in a single visual.  It's ideal for visualizing trends and relationships between different metrics while also displaying the underlying data in a tabular format for detailed analysis.

## Features

*   **Combined Bar and Line Chart:** Display two different measures on the same chart, one as bars and the other as a line, allowing for easy comparison and identification of correlations.
*   **Integrated Table:** Show the underlying data used for the chart in a table below the chart, providing detailed values and enabling in-depth analysis.
*   **Interactive Elements:**  Users can interact with the chart and table, such as hovering over data points to see tooltips, and potentially filtering data. ( *Note: Filtering capabilities may depend on Power BI's interaction model.* )
*   **Formatting Options:** Customize the colors, fonts, and styling of the chart and table to match your report's theme.
*   **Support for Measures and Dimensions:** Works with various measures and dimensions from your Power BI data model.

## How to Use

1.  **Import the Visual:** Download the `.pbiviz` file for this custom visual and import it into your Power BI report.
2.  **Add to Report:** Add the visual to your report page.
3.  **Assign Data Roles:** Drag and drop the appropriate fields from your data model into the following data roles:
    *   **Category (Dimension):** The dimension to use for the x-axis (e.g., date, product category).
    *   **Bar Values (Measure):** The measure to display as bars.
    *   **Line Values (Measure):** The measure to display as a line.
4.  **Configure Formatting:** Use the visual's formatting options in the Format pane to customize the appearance of the chart and table.

## Data Requirements

*   At least one dimension for the Category axis.
*   At least one measure for the Bar or Line Values.

## Formatting Options

The following formatting options are available ( *Note: This is an example, actual options may vary* ):

*   **Chart:**
    *   Bar Color
    *   Bar Transparency
    *   Line Color
    *   Data Labels
*   **Table:**
    *   Font Size
    *   Font Family
    *   Bold, Italic and Underline
    *   Turn on/off the series
    *   Display Units
*   **General:**
    *   Title
    *   Background Color

## Release Notes

*   **v1.0.0 (Initial Release):**  Initial version of the Bar & Line Chart with Table visual.

## Future Enhancements

*   More formatting options

## Support

For support or bug reports, please contact Kishore Kadhirvelu at kishorekthilak@gmail.com.
