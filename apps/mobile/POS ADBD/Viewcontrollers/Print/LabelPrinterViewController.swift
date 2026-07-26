//
//  LabelPrinterViewController.swift
//  POS ADBD
//
//  Created by Tran Trinh on 8/8/19.
//  Copyright © 2019 Trinh Tran. All rights reserved.
//

import Foundation
import UIKit

class LabelPrinterViewController : BaseViewControler{
    
    class func instance() -> LabelPrinterViewController{
        return Utils.storyboardBoardWithName(storyboardName: "Main").instantiateViewController(withIdentifier: "LabelPrinterViewController") as! LabelPrinterViewController
    }
    
    
}
