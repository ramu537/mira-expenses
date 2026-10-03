import AiCaptureDialog from "./AiCaptureDialog";

export default function AiExpenseCaptureModal(props) {
  return <AiCaptureDialog {...props} targetDomain={"EXPENSE"}
    title="Log an expense with AI"
    description="Type what you spent. AI extracts the amount, description and category, then logs it. A receipt photo is optional."
    placeholder="Paid ₹280 for lunch at KFC today."
    examples={["Paid ₹280 for lunch at KFC.", "Electricity bill ₹1,450 paid today.", "Spent ₹85 on a metro ride."]}
    submitLabel="Log with AI"
    label="What did you spend?"
    imageLabel="Add a receipt or bill photo"
    dated={true} />;
}
