//
//  PreviewHeaderCell.swift
//  POS ADBD
//
//  Created by Tran Trinh on 12/13/19.
//  Copyright © 2019 Trinh Tran. All rights reserved.
//

import Foundation
import UIKit

class PreviewHeaderCell : UITableViewCell{
    
    @IBOutlet weak var createAt: UILabel!
    @IBOutlet weak var lbOrderCode: UILabel!
    @IBOutlet weak var lbPhone: UILabel!
    @IBOutlet weak var lbStoreName: UILabel!
    @IBOutlet weak var lbAddress: UILabel!
    @IBOutlet weak var barcode: UIImageView!
    @IBOutlet weak var lbCustomerName: UILabel!
    @IBOutlet weak var lbCustomerPhone: UILabel!
    
    func bindOrder(order: Order){
        let orderCode = order.orderNumber
        barcode.image = "\(orderCode)".barcode()
    }
}
