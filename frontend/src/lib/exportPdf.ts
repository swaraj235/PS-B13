export interface PdfReportData {
  title: string
  subtitle: string
  headers: string[]
  rows: (string | number)[][]
  summaryStats?: { label: string; value: string | number }[]
}

export function generatePdfReport(data: PdfReportData) {
  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    alert('Please allow popups to generate PDF report.')
    return
  }

  const dateStr = new Date().toLocaleString()

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${data.title}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            margin: 20px;
            color: #1e293b;
            background: #fff;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #0284c7;
            padding-bottom: 12px;
            margin-bottom: 20px;
          }
          .title-area h1 {
            margin: 0;
            font-size: 20px;
            color: #0f172a;
          }
          .title-area p {
            margin: 4px 0 0 0;
            font-size: 12px;
            color: #64748b;
          }
          .stamp {
            text-align: right;
            font-size: 11px;
            color: #64748b;
          }
          .stats-grid {
            display: flex;
            gap: 12px;
            margin-bottom: 20px;
          }
          .stat-card {
            flex: 1;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 10px 14px;
          }
          .stat-card .label {
            font-size: 10px;
            text-transform: uppercase;
            color: #64748b;
            font-weight: 700;
          }
          .stat-card .val {
            font-size: 16px;
            font-weight: 800;
            color: #0284c7;
            margin-top: 2px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
            margin-top: 10px;
          }
          th {
            background: #f1f5f9;
            color: #334155;
            text-align: left;
            padding: 8px 10px;
            border-bottom: 2px solid #cbd5e1;
            text-transform: uppercase;
            font-size: 10px;
          }
          td {
            padding: 8px 10px;
            border-bottom: 1px solid #e2e8f0;
            color: #334155;
          }
          tr:nth-child(even) {
            background: #f8fafc;
          }
          .footer {
            margin-top: 30px;
            border-top: 1px solid #e2e8f0;
            padding-top: 10px;
            font-size: 10px;
            color: #94a3b8;
            display: flex;
            justify-content: space-between;
          }
          @media print {
            body { margin: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div className="header">
          <div className="title-area">
            <h1>⚡ MSEDCL GridSentinel — ${data.title}</h1>
            <p>${data.subtitle}</p>
          </div>
          <div className="stamp">
            <strong>Generated:</strong> ${dateStr}<br/>
            <strong>System:</strong> Pune Circle Utility Control
          </div>
        </div>

        ${data.summaryStats ? `
          <div className="stats-grid">
            ${data.summaryStats.map(s => `
              <div className="stat-card">
                <div className="label">${s.label}</div>
                <div className="val">${s.value}</div>
              </div>
            `).join('')}
          </div>
        ` : ''}

        <table>
          <thead>
            <tr>
              ${data.headers.map(h => `<th>${h}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${data.rows.map(row => `
              <tr>
                ${row.map(cell => `<td>${cell}</td>`).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div className="footer">
          <span>GridSentinel AI Utility Control Platform — Official MSEDCL Audit Report</span>
          <span>Page 1 of 1</span>
        </div>

        <script>
          window.onload = function() {
            window.print();
          }
        </script>
      </body>
    </html>
  `

  printWindow.document.open()
  printWindow.document.write(html)
  printWindow.document.close()
}
