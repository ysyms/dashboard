import { dashboard_backend } from "../../declarations/dashboard_backend";


  const icrc1_token_info = await dashboard_backend.icrc1_token_info
  ("vfhdx-67tj7-akypt-6a6fx-yqzlr-3om4p-a7cem-qkozv-76oie-ghfgv-jae",
  "zfcdd-tqaaa-aaaaq-aaaga-cai"
  );

  const neuron_info = await dashboard_backend.get_icp_neuron_info(11639064448884146179n)
  console.log(neuron_info)

  document.getElementById("record").innerText = icrc1_token_info[1]+"  "
  +convertE8sToNumber(icrc1_token_info[0]);


function convertE8sToNumber(e8sValue) {
  const scaleFactor = Math.pow(10, 8);
  return parseFloat(e8sValue) / scaleFactor;
}
